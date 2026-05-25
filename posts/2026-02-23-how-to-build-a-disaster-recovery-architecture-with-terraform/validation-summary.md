# Validation Summary: How to Build a Disaster Recovery Architecture with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Backup
- Amazon RDS for PostgreSQL
- Amazon ECS on Fargate
- Amazon Route 53 health checks and failover routing
- Amazon CloudWatch alarms
- AWS Lambda
- Amazon SNS
- Amazon S3 Cross-Region Replication
- AWS KMS

## Sources Consulted
- Terraform AWS provider documentation for `aws_backup_plan`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/backup_plan.html
- Terraform AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider documentation for `aws_route53_health_check`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_health_check
- Terraform AWS provider documentation for `aws_route53_record`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider documentation for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform AWS provider documentation for `aws_lambda_function`, `aws_lambda_permission`, `aws_sns_topic`, and `aws_sns_topic_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider documentation for `aws_s3_bucket_replication_configuration` and `aws_s3_bucket_versioning`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- AWS Disaster Recovery of Workloads on AWS whitepaper: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- Amazon RDS for PostgreSQL read replica documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.html
- Amazon Route 53 active-active and active-passive failover documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-types.html
- Amazon Route 53 health check CloudWatch monitoring documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-health-checks.html
- Amazon S3 replication requirements documentation: https://docs.aws.amazon.com/AmazonS3/latest/dev/replication-and-other-bucket-configs.html
- Amazon SNS cross-region delivery documentation: https://docs.aws.amazon.com/sns/latest/dg/sns-cross-region-delivery.html
- Linked OneUptime monitoring article: https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-monitoring-and-alerting-stack-with-terraform/view

## Issues Found
- The AWS Backup snippet referenced `aws_backup_vault.dr.arn` without defining the DR backup vault. Added a DR-region `aws_backup_vault` resource so the `copy_action` destination is backed by an actual vault.
- The failover section implied that scaling the DR region was sufficient, but an RDS for PostgreSQL read replica is read-only until promoted. Updated the text and Lambda environment variables to make replica promotion part of failover.
- The CloudWatch alarm for the Route 53 health check used the DR provider. Route 53 health check metrics are available in CloudWatch only in `us-east-1`, so the alarm and SNS topic now use an `aws.us_east_1` provider alias.
- The alarm sent to SNS but did not show the Lambda subscription or invoke permission needed for SNS to trigger the Lambda function. Added `aws_lambda_permission` and `aws_sns_topic_subscription`.
- The S3 replication snippet did not enable bucket versioning. S3 replication requires versioning on both source and destination buckets, so versioning resources and an explicit dependency were added.

## Review Notes
The examples are still illustrative snippets and assume surrounding resources exist, including provider aliases, KMS keys, IAM roles and policies, VPC/subnet resources, load balancers, ECS task definitions, and bucket resources. The Route 53 failover records are technically valid for active-passive DNS failover, but production DR plans should also test failback behavior, DNS TTL effects, application database endpoint switching, and RDS replica lag.
