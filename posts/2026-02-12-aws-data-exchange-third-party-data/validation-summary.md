# Validation Summary: How to Set Up AWS Data Exchange for Third-Party Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Data Exchange
- AWS CLI
- Amazon S3
- Amazon EventBridge
- AWS Lambda
- AWS CloudFormation
- AWS IAM
- Amazon Athena
- Amazon Redshift
- AWS CloudTrail
- Amazon CloudWatch Logs

## Sources Consulted
- AWS CLI Command Reference: AWS Data Exchange, https://docs.aws.amazon.com/cli/latest/reference/dataexchange/
- AWS CLI Command Reference: dataexchange list-data-sets, https://docs.aws.amazon.com/cli/latest/reference/dataexchange/list-data-sets.html
- AWS CLI Command Reference: dataexchange create-job, https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dataexchange/create-job.html
- AWS Data Exchange API Reference: CreateJob, https://docs.aws.amazon.com/data-exchange/latest/apireference/API_CreateJob.html
- AWS Data Exchange User Guide: EventBridge events, https://docs.aws.amazon.com/data-exchange/latest/userguide/cloudwatch-events.html
- AWS Data Exchange User Guide: Exporting revisions, https://docs.aws.amazon.com/data-exchange/latest/userguide/exporting-revisions.html
- AWS Data Exchange User Guide: Key patterns when exporting revisions, https://docs.aws.amazon.com/data-exchange/latest/userguide/revision-export-keypatterns.html
- AWS Data Exchange User Guide: Automatically exporting revisions to S3, https://docs.aws.amazon.com/data-exchange/latest/userguide/auto-export-rev-s3-console-sub.html
- AWS Data Exchange User Guide: Monitoring AWS Data Exchange, https://docs.aws.amazon.com/data-exchange/latest/userguide/monitoring-overview.html
- AWS Data Exchange Pricing, https://aws.amazon.com/data-exchange/pricing/
- OneUptime linked posts, https://oneuptime.com/blog/post/2026-02-12-aws-cli-named-profiles/view and https://oneuptime.com/blog/post/2026-02-06-aws-cloudwatch-logs-exporter-opentelemetry-collector/view

## Issues Found
- The post claimed updates flow in automatically after subscription. Updated this to say providers publish updates as revisions and subscribers can automate delivery, which matches the AWS Data Exchange revision model.
- The post said users could subscribe via `aws dataexchange create-data-set`. That command creates provider-owned data sets; it does not subscribe a consumer to a product. Replaced the example with valid subscriber-side commands for listing entitled data sets and their revisions after subscription.
- The S3 export key patterns did not include `${Asset.Name}` or `${Asset.Id}`. AWS requires one of those asset references for revision exports, so the examples now include `${Asset.Id}`.
- The EventBridge rule and Lambda code used `detail.DataSetId` and `detail.RevisionId`, but AWS Data Exchange revision-published events provide `detail.DataSets` and `detail.RevisionIds`. Updated the event pattern and Lambda code to use the documented event shape.
- The CloudFormation snippet referenced a Lambda role but did not define it, and it did not grant EventBridge permission to invoke the Lambda function. Added a minimal `AWS::IAM::Role` and `AWS::Lambda::Permission` resource.
- The monitoring section referred to CloudWatch metrics for AWS Data Exchange. AWS documents EventBridge/CloudWatch Events, CloudWatch Logs, and CloudTrail for monitoring AWS Data Exchange, so the wording was corrected.
- The cost section conflated data transfer with S3 PUT pricing. Updated it to distinguish S3 request costs from cross-Region data transfer costs.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI validation was performed against the official AWS CLI command reference. The extracted Lambda code from the CloudFormation snippet was compiled locally with Python 3 to verify syntax.
