import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

import { 
  aws_ec2 as ec2,
  aws_ecs as ecs,
  aws_ecs_patterns as ecs_patterns,
  aws_apigateway as apigateway 
} from 'aws-cdk-lib'
import { StackPropsType } from './types/TargetEnvType'

export class NextStartupStack extends cdk.Stack {
  //constructor(scope: Construct, id: string, props?: cdk.StackProps) {
  constructor(scope: Construct, id: string, props: StackPropsType) {
    super(scope, id, props);
    
    // Auto Scaling Settings
    /*
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
    */

    // VPC Link
    /*
    const link = new apigateway.VpcLink(this, "link", {
      targets: [loadBalancedFargateService.loadBalancer],
    });

    const getIntegration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: "GET",
      options: {
        connectionType: apigateway.ConnectionType.VPC_LINK,
        vpcLink: link,
      },
    });
    
    const postIntegration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: "POST",
      options: {
        connectionType: apigateway.ConnectionType.VPC_LINK,
        vpcLink: link,
      },
    });
    
    // API Gateway
    const api = new apigateway.RestApi(this, 'next-startup-api', {
      restApiName: `NextStartUpApi-${props.targetEnv}`
    })
    api.root.addMethod('ANY')
    */
  }
}
