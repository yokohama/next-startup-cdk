#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { TargetEnvType, RailsEnvType } from '../lib/types/TargetEnvType';

import { NextStartupStack } from '../lib/next-startup-stack';

let targetEnv :TargetEnvType = 'local'
let dbUser :string = 'db_user'
let dbName :string = 'local_db'
let railsEnv: RailsEnvType = 'development'
let vpcSubnet = '10.0.0.0/24'

if (process.env.TARGET_ENV === 'dev') {
  targetEnv = 'dev'
  dbName = 'dev_db'
  vpcSubnet = '10.0.1.0/24'
}
if (process.env.TARGET_ENV === 'prod') {
  targetEnv = 'prod'
  dbName = 'prod_db'
  railsEnv = 'production'
  vpcSubnet = '10.0.2.0/24'
}

const app = new cdk.App();

// cdk ls
new NextStartupStack(app, `NextStartupStack-${targetEnv}`, {
  targetEnv, 
  railsEnv, 
  vpcSubnet,
  dbName, 
  dbUser
})