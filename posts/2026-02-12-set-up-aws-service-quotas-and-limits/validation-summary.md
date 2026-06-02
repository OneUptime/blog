# Validation Summary: How to Set Up AWS Service Quotas and Limits

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Service Quotas
- AWS CLI
- AWS Trusted Advisor
- Amazon CloudWatch
- AWS Lambda
- Amazon EC2
- Amazon VPC
- Amazon EBS
- Amazon S3
- boto3 for Python

## Sources Consulted
- AWS CLI Command Reference: Service Quotas - https://docs.aws.amazon.com/cli/latest/reference/service-quotas/
- AWS CLI Service Quotas examples - https://docs.aws.amazon.com/cli/latest/userguide/cli_service-quotas_code_examples.html
- Service Quotas and Amazon CloudWatch alarms - https://docs.aws.amazon.com/servicequotas/latest/userguide/configure-cloudwatch.html
- Amazon CloudWatch AWS usage metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Service-Quota-Integration.html
- AWS Lambda concurrency monitoring - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html
- AWS Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- Amazon EC2 service quotas - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-resource-limits.html
- Amazon VPC quotas - https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- Amazon EBS quotas - https://docs.aws.amazon.com/ebs/latest/userguide/ebs-resource-quotas.html
- Amazon S3 bucket quotas - https://docs.aws.amazon.com/AmazonS3/latest/userguide/BucketRestrictions.html
- Amazon RDS DB instance quotas - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.DBInstance.html
- Amazon ECS service quota announcement - https://aws.amazon.com/about-aws/whats-new/2021/01/amazon-ecs-increased-service-quotas-tasks-per-service-services-per-cluster/
- IAM and AWS STS quotas - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_iam-quotas.html
- AWS CloudFormation quotas - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
- AWS Trusted Advisor documentation - https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html

## Issues Found
- The EC2 quota example treated `L-1216C47A` as an instance count. This quota is for Running On-Demand Standard vCPUs, so the Python examples now compare vCPU usage against the quota.
- The EBS examples and table used a stale generic volume-count quota of 10,000. The post now uses the current gp3 storage quota example and calculates usage in GiB/TiB.
- The security group check used a per-VPC default of 500. Current VPC documentation lists VPC security groups per Region as 2,500, so the code now checks the regional quota.
- The CloudWatch alarm section described `put-service-quota-increase-request-into-template` as creating a quota usage alarm. That command manages quota request templates, so the post now shows `request-service-quota-increase` for CLI quota increase requests.
- The Lambda alarm used `ConcurrentExecutions`, which does not fully reflect reserved and provisioned concurrency. The alarm now uses `ClaimedAccountConcurrency`, which AWS recommends for account concurrency quota monitoring.
- The automated Lambda monitor used fixed February 2026 timestamps and assumed CloudWatch datapoints are ordered. It now uses a rolling 24-hour window and selects the newest datapoint by timestamp.
- The S3 default bucket quota was outdated at 100. The table now lists the current default of 10,000 general purpose buckets per account.
- The standalone pre-deployment Python snippet lacked its `boto3` import. Added the import so the code block is syntactically complete.

## Review Notes
The sample scripts are intentionally illustrative and still use simplified usage calculations for a small set of quota types. A production implementation should add pagination for large accounts and account for EC2 quota families beyond Standard On-Demand vCPUs.
