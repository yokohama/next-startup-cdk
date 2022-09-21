#!/bin/bash

# ECSクラスターの1つ目を変数に格納
export CLUSTER=`aws ecs list-clusters | jq -r '.clusterArns[0]'`

# そのクラスター内の停止されたタスクの1つ目を変数に格納
export TASK_ID=`aws ecs list-tasks \
  --cluster $CLUSTER \
  --desired-status STOPPED | jq -r '.taskArns[0]'`

# そのタスクの状態（ログ）を error.jsonに書き込み
aws ecs describe-tasks \
  --cluster $CLUSTER \
  --tasks $TASK_ID > error.json
