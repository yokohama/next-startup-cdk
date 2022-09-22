import { StackProps } from "aws-cdk-lib";

export type TargetEnvType = 'local' | 'dev' | 'prod'

export type RailsEnvType = 'development' | 'production'

export type StackPropsType = StackProps & {
  targetEnv: TargetEnvType, 
  railsEnv: RailsEnvType, 
  dbName: string, 
  dbUser: string
}