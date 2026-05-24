# Validation Summary: How to Create Multi-AZ Database Deployments with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS RDS (PostgreSQL)
- AWS VPC, Subnets, Security Groups
- AWS IAM (Enhanced Monitoring role)
- AWS CloudWatch (alarms, metrics)
- AWS SNS (event notifications)
- AWS RDS Event Subscriptions
- AWS CLI

## Sources Consulted
- Terraform AWS Provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider — `aws_db_subnet_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS Provider — `aws_db_parameter_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS Provider — `aws_db_event_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_event_subscription
- Terraform AWS Provider — `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS Docs — RDS for PostgreSQL memory tuning (shared_buffers formula): https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Tuning.concepts.memory.html
- AWS re:Post — shared_buffers parameter formula explanation: https://repost.aws/knowledge-center/rds-aurora-postgresql-shared-buffers
- AWS Docs — RDS event categories and messages: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- AWS Docs — RDS Multi-AZ deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html
- AWS Docs — Enhanced Monitoring setup (service principal): https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- AWS CLI Reference — `reboot-db-instance`: https://docs.aws.amazon.com/cli/latest/reference/rds/reboot-db-instance.html

## Issues Found

1. **Incorrect `shared_buffers` formula in the PostgreSQL parameter group.**
   - The post originally specified `value = "{DBInstanceClassMemory/4}"`.
   - This is invalid because `shared_buffers` is measured in 8 KB pages, while `DBInstanceClassMemory` is in bytes. Dividing by 4 would attempt to allocate roughly four times the instance memory in 8 KB pages (e.g. ~35 TB for a 16 GB instance), which RDS rejects and would prevent the instance from starting.
   - Fixed by changing the value to `"{DBInstanceClassMemory/32768}"`, which is the AWS-documented formula for setting `shared_buffers` to approximately 25% of instance memory (32768 = 4 × 8192, where 8192 is the 8 KB page size).

## Review Notes

- All other Terraform resource arguments (`aws_db_instance`, `aws_db_subnet_group`, `aws_security_group`, `aws_db_event_subscription`, `aws_cloudwatch_metric_alarm`, `aws_iam_role`, `aws_iam_role_policy_attachment`, `aws_sns_topic`) use correct, current syntax.
- `sns_topic` is the correct argument name for `aws_db_event_subscription` (not `sns_topic_arn`).
- Event categories `failover`, `failure`, and `notification` are all valid for the `db-instance` source type.
- `monitoring.rds.amazonaws.com` is the correct service principal for the Enhanced Monitoring IAM role trust policy.
- `monitoring_interval = 60` and `performance_insights_retention_period = 7` are both valid values.
- `instance_class = "db.r6g.large"`, `storage_type = "gp3"`, and `engine_version = "15.4"` are valid combinations for RDS PostgreSQL.
- The Multi-AZ failover time claim of "60 to 120 seconds" aligns with AWS documentation.
- The `aws rds reboot-db-instance --force-failover` command is correct and current.
- Future caveat: PostgreSQL 15.4 will eventually be deprecated by AWS RDS. Readers may want to use a newer minor version (e.g. 15.x latest) when deploying, though the example as written remains valid for now.
