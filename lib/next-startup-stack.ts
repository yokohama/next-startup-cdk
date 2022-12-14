import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

import { 
  aws_ecr as ecr,
  aws_ec2 as ec2,
  aws_rds as rds,
  aws_ecs as ecs,
  aws_ecs_patterns as ecs_patterns,
  aws_secretsmanager as secretmanager,
  aws_apigateway as apigateway,
  aws_elasticloadbalancingv2 as elbv2,
} from 'aws-cdk-lib'

import { StackPropsType } from './types/TargetEnvType';

export class NextStartupStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc

  constructor(scope: Construct, id: string, props: StackPropsType) {
    super(scope, id, props);
    
    const rdsDeleteAutomatedBackups = props.targetEnv == ('local' || 'dev')
    
    // ECR
    const repository = new ecr.Repository(this, 'Ecr', {
      repositoryName: `ecr-${props.targetEnv}`,
      imageScanOnPush: true,
    });
    
    // VPC
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      cidr: props.vpcSubnet,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        { 
          name: 'Public', subnetType: ec2.SubnetType.PUBLIC, 
          cidrMask: 27 
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          //subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 27,
        },
      ],
    });
    
    // RDS Secret
    const secret = new secretmanager.Secret(this, 'RdsSecret', {
      secretName: `postgres-${props.targetEnv}`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: props.dbUser }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    })

    // RDS SecurityGroup
    const rdsSG = new ec2.SecurityGroup(this, 'RdsSG', {
      vpc: this.vpc,
      allowAllOutbound: true
    });
    rdsSG.addIngressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.tcp(5432)
    );

    const postgresql = new rds.DatabaseInstance(this, 'Rds', {
      deleteAutomatedBackups: rdsDeleteAutomatedBackups,
      instanceIdentifier: `Rds-${props.targetEnv}`,
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2,
      }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      vpc: this.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        //subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      securityGroups: [rdsSG],
      credentials: rds.Credentials.fromSecret(secret),
      databaseName: props.dbName
    });
    
    // ECS Cluster
    const ecsCluster = new ecs.Cluster(this, 'EcsCluster', {
      clusterName: `Cluster-${props.targetEnv}`,
      vpc: this.vpc,
      containerInsights: true,
    });
    
    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      family: `task-${props.targetEnv}`
    })

    taskDefinition.addContainer('Container', {
      containerName: `Container-${props.targetEnv}`,
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      memoryLimitMiB: 256,
      logging: ecs.LogDriver.awsLogs({
        streamPrefix: repository.repositoryName,
      }),
      environment: {
        RAILS_ENV: props.railsEnv,
        RAILS_LOG_TO_STDOUT: 'true',
        DATABASE_HOST: postgresql.instanceEndpoint.hostname,
        DATABASE_NAME: props.dbName,
        DATABASE_USER: props.dbUser,
      },
      secrets: {
        'DATABASE_PASSWORD': ecs.Secret.fromSecretsManager(secret, 'password')
      },
    })
    .addPortMappings({
      protocol: ecs.Protocol.TCP,
      containerPort: 3000
    });
    
    // NLB
    const nlb = new elbv2.NetworkLoadBalancer(this, 'Nlb', {
      vpc: this.vpc,
      loadBalancerName: `Nlb-${props.targetEnv}`,
      internetFacing: false
    });
    
    // TODO: ????????????????????????????????????????????????port 3000
    const loadBalancedFargateService = 
      new ecs_patterns.NetworkLoadBalancedFargateService(
        this, 
        'LoadBalancedFargateService', 
        {
          serviceName: `Service-${props.targetEnv}`,
          assignPublicIp: false,
          cluster: ecsCluster,
          taskSubnets: this.vpc.selectSubnets({
            //subnetType: ec2.SubnetType.PRIVATE_ISOLATED
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
          }),
          memoryLimitMiB: 1024,
          cpu: 512,
          desiredCount: 2,
          taskDefinition: taskDefinition,
          publicLoadBalancer: true,
          loadBalancer: nlb
        }
      )
      loadBalancedFargateService.service.connections.allowFrom(
        ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
        ec2.Port.tcp(3000)
      )
    
    // Rilas??????DNS???????????????????????????????????????????????????????????????????????????????????????NLB???????????????????????????
    //const container = taskDefinition.findContainer(`Container-${props.targetEnv}`)
    //container?.addEnvironment('VALID_HOST', loadBalancedFargateService.loadBalancer.loadBalancerDnsName)

    // Auto Scaling Settings
    const scalableTarget =
      loadBalancedFargateService.service.autoScaleTaskCount({
        minCapacity: 2,
        maxCapacity: 10,
      });
    scalableTarget.scaleOnCpuUtilization("CpuScaling", {
      targetUtilizationPercent: 50,
    });
    scalableTarget.scaleOnMemoryUtilization("MemoryScaling", {
      targetUtilizationPercent: 50,
    });

    // VPC Link
    const link = new apigateway.VpcLink(this, "Link", {
      vpcLinkName: `Link-${props.targetEnv}`,
      targets: [loadBalancedFargateService.loadBalancer],
    });

    const api = new apigateway.RestApi(this, 'Api', {
      restApiName: `Api-${props.targetEnv}`,
      description: props.targetEnv
    });
    api.root.addMethod("ANY")
  }
}
