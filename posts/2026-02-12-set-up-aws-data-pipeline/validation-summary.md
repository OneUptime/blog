# Validation Summary: How to Set Up AWS Data Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Data Pipeline
- AWS CLI
- IAM roles and policies
- Amazon S3
- Amazon RDS
- Amazon DynamoDB
- Amazon EMR
- Amazon SNS

## Sources Consulted
- AWS Data Pipeline Developer Guide: What is AWS Data Pipeline? https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/dp-how-pipeline-lifecycle.html
- AWS Data Pipeline Developer Guide: Document History https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/DocHistory.html
- AWS Data Pipeline Developer Guide: IAM Roles for AWS Data Pipeline https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/dp-iam-roles.html
- AWS Data Pipeline Developer Guide: Pipeline definition file syntax https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/dp-writing-pipeline-definition.html
- AWS Data Pipeline object reference: Schedule https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/dp-object-schedule.html
- AWS Data Pipeline object reference: RdsDatabase, SqlDataNode, S3DataNode, CopyActivity, Ec2Resource, SnsAlarm, DynamoDBDataNode, EmrCluster, EmrActivity https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/dp-pipeline-objects.html
- AWS CLI Command Reference: datapipeline create-pipeline https://docs.aws.amazon.com/cli/latest/reference/datapipeline/create-pipeline.html
- AWS CLI Command Reference: datapipeline put-pipeline-definition https://docs.aws.amazon.com/cli/latest/reference/datapipeline/put-pipeline-definition.html
- AWS CLI Command Reference: datapipeline validate-pipeline-definition, list-runs, query-objects https://docs.aws.amazon.com/cli/latest/reference/datapipeline/
- AWS Data Pipeline expressions reference https://docs.aws.amazon.com/datapipeline/latest/DeveloperGuide/dp-pipeline-expressions.html

## Issues Found
- The post presented AWS Data Pipeline as generally available. AWS documents that it is in maintenance mode and no longer available to new customers, so the introduction and recommendation language now scope the guidance to existing customers and existing workloads.
- The pipeline role trust policy included `elasticmapreduce.amazonaws.com`. The pipeline role should be assumed by `datapipeline.amazonaws.com`; the resource role covers EC2 resources. Updated the trust policy.
- The pipeline role command attached the deprecated AWS managed `AWSDataPipelineRole` policy. Updated the guidance to create and attach a custom scoped policy based on AWS's current role policy example.
- The schedule examples used both `startAt` and `startDateTime`, which are mutually exclusive. Updated both schedules to use only future `startDateTime` values as of the validation date.
- The RDS pipeline used uppercase `CASCADE` for `failureAndRerunMode`; AWS examples use lowercase `cascade`. Updated the value.
- The VPC EC2 resource used `securityGroups` with a security group ID. AWS's VPC example uses `securityGroupIds`, so the field was corrected.
- The post used `validate-pipeline-definition --pipeline-definition`, but the AWS CLI command does not support that option. Updated the activation workflow to rely on `put-pipeline-definition`, which validates and reports errors as it uploads.
- The `list-runs --status` example used uppercase `RUNNING`; the AWS CLI documents lowercase status filters. Updated it to `running`.
- The `query-objects` example used `--query` for Data Pipeline selectors; that option is JMESPath output filtering. Updated it to `--objects-query`.
- The S3 path formatting examples used `yyyy` instead of AWS's documented `YYYY` format examples. Updated the expressions.
- The SNS alarm messages referenced `@scheduledStartTime` directly. AWS documents `node.@scheduledStartTime` for alarm back-references, so the messages were updated.
- The EMR cluster `terminateAfter` value was a period string; AWS documents the `EmrCluster` field as a number of hours. Updated it to `"4"`.

## Review Notes
The local AWS CLI was not installed, so command validation was performed against the official AWS CLI command reference. The post remains useful only for existing AWS Data Pipeline users; new AWS customers should use alternatives such as AWS Glue, Step Functions, EventBridge, Lambda, or MWAA.
