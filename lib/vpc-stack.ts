import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

import { 
  aws_ecr as ecr,
  aws_ec2 as ec2,
  aws_rds as rds,
  aws_ecs as ecs,
  aws_ecs_patterns as ecs_patterns,
  aws_secretsmanager as secretmanager,
  aws_apigateway as apigateway
} from 'aws-cdk-lib'

import { StackPropsType } from './types/TargetEnvType';

const VPC_SUBNET = '10.0.0.0/24'

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc

  constructor(scope: Construct, id: string, props: StackPropsType) {
    super(scope, id, props);

    // ECR
    const repository = new ecr.Repository(this, "Repository", {
      imageScanOnPush: true,
    });
    
    // VPC
    this.vpc = new ec2.Vpc(this, 'Vpc', {
      cidr: VPC_SUBNET,
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
    const secret = new secretmanager.Secret(this, 'postgres', {
      secretName: 'postgres',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: props.dbUser }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    })

    // RDS
    const rdsSG = new ec2.SecurityGroup(this, 'rds-sg', {
      vpc: this.vpc,
      allowAllOutbound: true
    });
    rdsSG.addIngressRule(
      ec2.Peer.ipv4('0.0.0.0/0'),
      ec2.Port.tcp(5432)
    );

    const postgresql = new rds.DatabaseInstance(this, 'Instance', {
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
      vpc: this.vpc,
      containerInsights: true,
    });
    
    // ECS Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(
      this,
      'TaskDefinition',
    )
    taskDefinition.addContainer('rootContainer', {
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
      //entryPoint: ['rake', 'db:migrate'],
      //workingDirectory: '/opt/app'
    })
    .addPortMappings({
      protocol: ecs.Protocol.TCP,
      containerPort: 3000
    });
    
    const loadBalancedFargateService = 
      new ecs_patterns.NetworkLoadBalancedFargateService(
        this, 
        'LoadBalancedFargateService', 
        {
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
        }
      )

    loadBalancedFargateService.service.connections.allowFrom(
      ec2.Peer.ipv4(this.vpc.vpcCidrBlock),
      ec2.Port.tcp(3000)
    )
  }
}