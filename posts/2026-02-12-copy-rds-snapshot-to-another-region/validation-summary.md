# Validation Summary: How to Copy an RDS Snapshot to Another Region

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- Amazon RDS DB snapshots
- AWS CLI
- AWS KMS
- Amazon EventBridge
- AWS Lambda
- Python / boto3
- CloudWatch / SNS monitoring

## Sources Consulted
- Amazon RDS User Guide: Copying a DB snapshot: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html
- AWS CLI Command Reference: `aws rds copy-db-snapshot`: https://docs.aws.amazon.com/cli/latest/reference/rds/copy-db-snapshot.html
- Amazon RDS User Guide: Overview of Amazon RDS event notification and EventBridge examples: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.overview.html
- Amazon RDS User Guide: Amazon RDS event categories and event messages: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- Amazon EventBridge event reference for Amazon RDS: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-rds.html
- Amazon RDS User Guide: Quotas and constraints for Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Boto3 RDS `copy_db_snapshot` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/copy_db_snapshot.html
- Amazon RDS pricing: https://aws.amazon.com/rds/pricing/
- AWS Price List API data for Amazon RDS in `us-west-2`: https://pricing.us-east-1.amazonaws.com/offers/v1.0/aws/AmazonRDS/current/us-west-2/index.json

## Issues Found
- The prerequisites said an encrypted snapshot's KMS key must allow cross-region operations. AWS KMS keys are region-specific for this workflow, so the post now says to use a KMS key in the destination region with the required permissions.
- The encrypted snapshot permissions only mentioned `kms:CreateGrant` and `kms:DescribeKey`. AWS documents additional required KMS permissions for copying encrypted RDS snapshots, so the post now lists the additional actions.
- The EventBridge pattern matched `Message: "Automated snapshot created"` without the period used by AWS event messages. To avoid a brittle string match, the post now matches `EventID: "RDS-EVENT-0091"`.
- The Lambda example used `os.environ['AWS_REGION']` as the snapshot source region. The function now uses `event['region']`, which is the region where the RDS snapshot event originated.
- The cost estimate said a 500 GB destination snapshot would cost about `$12-15/month`. Current RDS backup storage pricing in `us-west-2` is `$0.095 per GB-month` for charged backup storage, which is about `$47.50/month` for 500 GB before data transfer, so the estimate was corrected and made region/rate-dependent.

## Review Notes
- The AWS CLI commands and boto3 `copy_db_snapshot` usage are syntactically valid and use current parameters.
- The cleanup example only processes the first `describe_db_snapshots` response page. That is usually enough under the default 100 manual DB instance snapshot quota, but a paginator would be safer for accounts with increased quotas.
