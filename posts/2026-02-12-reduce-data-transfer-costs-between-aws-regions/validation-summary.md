# Validation Summary: How to Reduce Data Transfer Costs Between AWS Regions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Cost Explorer
- Amazon VPC Flow Logs
- Amazon S3 Cross-Region Replication
- Amazon CloudFront
- Origin Access Control
- Amazon RDS
- AWS Backup
- Amazon DynamoDB Streams
- AWS Lambda
- AWS Budgets
- Python
- boto3
- requests

## Sources Consulted
- AWS CLI Command Reference: Cost Explorer get-cost-and-usage: https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- AWS CLI Command Reference: S3 put-bucket-replication: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- Amazon S3 User Guide: Replication configuration file elements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- Amazon CloudFront Developer Guide: Get started with a standard distribution using the AWS CLI: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/get-started-cli-tutorial.html
- Amazon CloudFront Developer Guide: Restrict access to an Amazon S3 origin: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- AWS CLI Command Reference: CloudFront create-distribution: https://docs.aws.amazon.com/cli/latest/reference/cloudfront/create-distribution.html
- Amazon CloudFront product page: https://aws.amazon.com/cloudfront/
- AWS Backup API Reference: CreateBackupPlan: https://docs.aws.amazon.com/aws-backup/latest/devguide/API_CreateBackupPlan.html
- AWS Backup Developer Guide: Backup plan options and configuration: https://docs.aws.amazon.com/aws-backup/latest/devguide/plan-options-and-configuration.html
- Amazon DynamoDB Developer Guide: Global tables: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
- Amazon DynamoDB Developer Guide: DynamoDB Streams and AWS Lambda triggers: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.Lambda.html
- AWS CLI Command Reference: Budgets create-budget: https://docs.aws.amazon.com/cli/latest/reference/budgets/create-budget.html
- AWS Cost Management User Guide: Budget filters: https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html
- Amazon EC2 On-Demand Pricing: https://aws.amazon.com/ec2/pricing/on-demand/

## Issues Found
- The opening pricing claim said cross-region data transfer costs $0.02 per GB "in most cases." AWS pricing varies by service and region pair, so this was changed to say that many common routes are around $0.02 per GB and that the example assumes that rate.
- The VPC Flow Logs comment said to enable flow logs "on your VPC peering connections." The shown command creates flow logs for a VPC, so the comment was changed to say VPCs involved in cross-region traffic.
- The S3 replication rule used a `Filter` but omitted `DeleteMarkerReplication`. AWS requires `DeleteMarkerReplication`, `Status`, and `Priority` when a replication rule includes `Filter`, so `DeleteMarkerReplication` was added with `Status` set to `Disabled`.
- The CloudFront example used a legacy Origin Access Identity placeholder. AWS recommends Origin Access Control for S3 origins, so the example was updated to create an OAC, use an empty `OriginAccessIdentity`, and set `OriginAccessControlId`.
- The CloudFront distribution example supplied `AllowedMethods` without `CachedMethods`. The documented AWS CLI distribution examples include `CachedMethods`, so it was added for `GET` and `HEAD`.
- The RDS/AWS Backup section said cross-region backup copy is "much cheaper" than continuous replication. This was too absolute, so it now says it can be cheaper when the workload can tolerate scheduled recovery points.
- The DynamoDB Streams Lambda example called `deserialize_dynamodb()` without defining it. It now imports `TypeDeserializer` from boto3 and defines the helper.

## Review Notes
- The AWS CLI was not installed in the workspace, so command validation was performed against official AWS CLI and service documentation instead of local `--help` output.
- The CloudFront example still requires a real bucket policy and the actual OAC ID returned by AWS before content can be served privately from S3.
