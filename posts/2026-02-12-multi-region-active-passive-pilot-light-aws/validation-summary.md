# Validation Summary: How to Set Up Multi-Region Active-Passive (Pilot Light) on AWS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS disaster recovery strategies
- Amazon Aurora Global Database
- Amazon S3 Cross-Region Replication
- Amazon DynamoDB global tables
- Amazon EC2 AMIs and launch templates
- Amazon EC2 Auto Scaling
- Elastic Load Balancing / Application Load Balancer
- AWS Lambda with boto3
- Amazon Route 53 health checks and DNS alias records
- Amazon CloudWatch alarms and metrics

## Sources Consulted
- AWS Disaster Recovery of Workloads on AWS: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- Amazon Aurora Global Database user guide: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- Aurora Global Database switchover and failover documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- AWS CLI RDS create-global-cluster reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-global-cluster.html
- AWS CLI RDS create-db-cluster reference: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- AWS CLI RDS failover-global-cluster reference: https://docs.aws.amazon.com/cli/latest/reference/rds/failover-global-cluster.html
- boto3 RDS failover_global_cluster reference: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/failover_global_cluster.html
- Amazon S3 replication configuration documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-add-config.html
- AWS CLI s3api put-bucket-replication reference: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-replication.html
- AWS CLI DynamoDB update-table reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS CLI Auto Scaling create-auto-scaling-group reference: https://docs.aws.amazon.com/cli/latest/reference/autoscaling/create-auto-scaling-group.html
- boto3 ELBv2 TargetInService waiter reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/elbv2/waiter/TargetInService.html
- Route 53 health check CloudWatch monitoring documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-health-checks.html
- Route 53 health check metrics and dimensions documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-cloudwatch.html
- Amazon CloudWatch alarm actions documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-actions.html

## Issues Found
- The AWS ARN examples used a 9-digit placeholder account ID (`123456789`). AWS account IDs in ARNs are 12 digits, so these were changed to `123456789012`.
- The S3 replication rule used an empty `Filter` object with enabled delete marker replication. I changed it to `{"Prefix": ""}` so the rule explicitly applies to the whole bucket with a prefix filter that supports delete marker replication.
- The Aurora failover Lambda called `failover_global_cluster` without `AllowDataLoss=True`. Current boto3/RDS behavior treats omission as a switchover-style operation, so the unplanned failover example now includes `AllowDataLoss=True`.
- The Aurora data loss statement said failover would lose "at most a second" of data. I changed this to clarify that replication lag is typically under a second, but actual unplanned-failover data loss depends on lag at the time of failure.
- The CloudWatch alarm for the Route 53 health check did not specify `us-east-1`, and the SNS action ARN used `us-west-2`. Route 53 health check metrics are available in CloudWatch in US East (N. Virginia), so the alarm now uses `--region "us-east-1"` and an example SNS topic ARN in `us-east-1`.
- The S3 DR cost row said "Replication storage only." I updated it to include replica storage, requests, and data transfer, which are part of S3 replication cost.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI and service documentation.
- The linked OneUptime URL returned HTTP 200 during validation.
- Some commands are intentionally illustrative and still require environment-specific values such as subnet IDs, security group IDs, target group ARNs, ALB DNS names, IAM permissions, certificates, and VPC/subnet settings.
