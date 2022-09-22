#!/bin/bash

LOG_GROUP_NAME=`aws logs describe-log-groups --query 'logGroups[*].logGroupName' | jq -r '.[]' | grep local | grep Task`
aws logs tail --since 1h --follow ${LOG_GROUP_NAME}
