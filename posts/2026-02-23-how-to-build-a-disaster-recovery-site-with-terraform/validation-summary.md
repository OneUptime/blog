# Validation Summary: How to Build a Disaster Recovery Site with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS disaster recovery strategies
- Amazon VPC and VPC peering
- Amazon Aurora Global Database
- Amazon S3 Cross-Region Replication
- Amazon ECS on AWS Fargate
- Elastic Load Balancing Application Load Balancer
- Amazon Route 53 health checks and failover routing
- Amazon CloudWatch alarms
- Amazon EventBridge / CloudWatch Events
- AWS Lambda
- Amazon SNS

## Sources Consulted
- AWS disaster recovery options whitepaper: https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html
- Amazon Aurora Global Database documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- Amazon Aurora Global Database switchover and failover documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- Amazon RDS FailoverGlobalCluster API reference: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_FailoverGlobalCluster.html
- Amazon Route 53 health check CloudWatch metrics documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-cloudwatch.html
- Amazon Route 53 health check alarm guidance: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/monitoring-health-checks.html
- Amazon Route 53 health check and DNS failover documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/welcome-health-checks.html
- Terraform AWS provider `aws_rds_global_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- Terraform AWS provider `aws_rds_cluster` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_s3_bucket_replication_configuration` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS provider `aws_cloudwatch_event_target` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_lambda_permission` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission

## Issues Found
- The AWS provider configuration only defined aliased providers, but Route 53, Route 53 record, and EventBridge resources did not specify a provider. Added a dedicated `aws.route53` provider and assigned it to the global Route 53 and automation resources.
- The automation snippet used a non-existent direct EventBridge event pattern for Route 53 health check status changes. Replaced it with a CloudWatch alarm on the Route 53 `AWS/Route53` `HealthCheckStatus` metric and an EventBridge rule for `CloudWatch Alarm State Change`.
- The EventBridge target for Lambda was missing the required Lambda resource-based permission. Added `aws_lambda_permission` allowing `events.amazonaws.com` to invoke the failover function.
- The failover automation described only scaling DR resources, but the Aurora Global Database secondary cluster must be promoted before it can serve writes. Updated the description and Lambda environment variables to include the DR region and global cluster identifier used by failover logic.
- Updated the service name from `Route53` to `Route 53` in the affected headings and prose to match AWS naming.

## Review Notes
- The Terraform snippets are illustrative and assume supporting resources already exist, including primary VPC, route tables, subnet groups, security groups, IAM roles and policies, KMS keys, ECS task definitions, ALB listeners and target groups, source S3 bucket versioning, Lambda package code, and hosted zone configuration.
- The S3 replication example uses KMS-encrypted object replication correctly at the replication configuration level, but a production implementation must also grant the replication IAM role the required S3 and KMS permissions.
- The post's automatic failover design depends on CloudWatch, EventBridge, Lambda, and RDS control plane operations. AWS disaster recovery guidance notes that control plane dependencies can reduce failover resilience, so production designs should test this path and consider manual approval or AWS Application Recovery Controller for critical workloads.
