import { StackProps } from "aws-cdk-lib";

export type TargetEnvType = 'local' | 'dev' | 'prod'

export type RailsEnvType = 'development' | 'production'

export type StackPropsType = StackProps & {
  targetEnv: TargetEnvType, 
  railsEnv: RailsEnvType, 
  vpcSubnet: string,
  dbName: string, 
  dbUser: string
}

export const VpcSubnet: { [key: string]: string } = {
  local: '10.0.0.0/24',
  dev: '10.0.0.1/24',
  prod: '10.0.0.2/24'
}