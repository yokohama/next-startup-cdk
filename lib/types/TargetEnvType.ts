import { 
  StackProps,
  aws_ecr as ecr
} from "aws-cdk-lib";

export type TargetEnvType = 'local' | 'dev' | 'prod'

export type RailsEnvType = 'development' | 'production'

export type StackPropsType = StackProps & {
  targetEnv: TargetEnvType, 
  repository: ecr.Repository,
  railsEnv: RailsEnvType, 
  dbName: string, 
  dbUser: string
}