#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { TargetEnvType, RailsEnvType } from '../lib/types/TargetEnvType';

import { EcrStack } from '../lib/ecr-stack';
import { VpcStack } from '../lib/vpc-stack';

let targetEnv :TargetEnvType = 'local'
let dbUser :string = 'db_user'
let dbName :string = 'local_db'
let railsEnv: RailsEnvType = 'development'

if (process.env.TARGET_ENV === 'dev') {
  targetEnv = 'dev'
  dbName = 'dev_db'
}
if (process.env.TARGET_ENV === 'prod') {
  targetEnv = 'prod'
  dbName = 'prod_db'
  railsEnv = 'production'
}

const app = new cdk.App();

// cdk ls
const repository = new EcrStack(app, 'NextStartupEcrStack').repo

// cdk ls
new VpcStack(app, `NextStartupVpcStack-${targetEnv}`, {
  targetEnv, 
  repository,
  railsEnv, 
  dbName, 
  dbUser
})
