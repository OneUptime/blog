# Validation Summary: How to Build a Hot Standby Database Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon Aurora PostgreSQL
- Amazon Aurora Global Database
- Amazon RDS Proxy
- Amazon CloudWatch alarms
- Amazon RDS event subscriptions
- Amazon EventBridge scheduled rules
- AWS Lambda
- AWS KMS

## Sources Consulted
- AWS Aurora Global Database documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- AWS Aurora Global Database failover and RPO lag documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- AWS Aurora replication documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
- AWS Aurora CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- AWS Aurora CloudWatch dimensions documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/dimensions.html
- AWS RDS Proxy for Aurora documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.html
- AWS EventBridge resource-based policy documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Terraform AWS provider `aws_rds_cluster_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS provider `aws_db_proxy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_proxy
- Terraform AWS provider `aws_rds_global_cluster` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- Terraform AWS provider `aws_db_event_subscription` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_event_subscription

## Issues Found
- The introduction described a hot standby as a fully synchronized replica with immediate takeover and minimal or zero data loss. This was too broad because Aurora Global Database and RDS read replicas use asynchronous replication. Changed the wording to describe a continuously updated replica with data loss depending on replication mode.
- The Aurora cluster snippet labeled `enabled_cloudwatch_logs_exports` as enhanced monitoring. That setting exports PostgreSQL logs to CloudWatch Logs; Enhanced Monitoring is configured on the instances with `monitoring_interval` and `monitoring_role_arn`. Updated the comment.
- The RDS Proxy section said failover is transparent to applications. AWS documents RDS Proxy as improving resiliency, preserving application connections, and reducing failover impact, but applications can still need retry/reconnect handling. Updated the wording to "reduces the impact of failover."
- The Global Database lag alarm used `AuroraGlobalDBReplicationLag` for Aurora PostgreSQL. AWS documentation recommends `AuroraGlobalDBRPOLag` for all Aurora PostgreSQL-based global databases. Updated the metric name and alarm description.
- The free storage alarm used the instance-level `FreeLocalStorage` metric with a cluster identifier dimension. Updated the alarm to monitor the writer instance with `DBInstanceIdentifier`.
- The scheduled Lambda failover test target did not grant EventBridge permission to invoke the Lambda function. Added an `aws_lambda_permission` resource with the EventBridge principal and rule ARN.

## Review Notes
- The Terraform snippets are illustrative and still depend on surrounding resources not shown in the post, such as subnet groups, security groups, IAM roles, KMS keys, Lambda deployment package, providers, and variables.
- AWS has announced an end-of-life date for the Performance Insights console experience and flexible retention periods on June 30, 2026. The Terraform arguments used in the post are still documented, but future updates should consider CloudWatch Database Insights guidance.
