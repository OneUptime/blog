# Validation Summary: How to Configure Database Backup Windows in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon RDS
- Amazon Aurora
- Amazon ElastiCache for Redis OSS
- Amazon DocumentDB
- Amazon Neptune
- Amazon EventBridge
- Amazon SNS

## Sources Consulted
- Terraform AWS provider documentation: `aws_db_instance` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider documentation: `aws_rds_cluster` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider documentation: `aws_elasticache_replication_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Terraform AWS provider documentation: `aws_docdb_cluster` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- Terraform AWS provider documentation: `aws_neptune_cluster` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/neptune_cluster
- Terraform AWS provider documentation: `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Amazon RDS documentation: Managing automated backups - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ManagingAutomatedBackups.html
- Amazon RDS documentation: Event categories and event messages - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- Amazon EventBridge documentation: Amazon RDS events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-rds.html
- Amazon EventBridge documentation: Resource-based policies for SNS targets - https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html

## Issues Found
- The EventBridge event pattern used `detail_type`, but EventBridge event patterns require the JSON key `detail-type`. Changed the Terraform `jsonencode` map key to `"detail-type"` so the rule matches RDS snapshot events.
- The EventBridge-to-SNS example created an SNS target but did not grant EventBridge permission to publish to the topic. Added an `aws_iam_policy_document` and `aws_sns_topic_policy` granting `events.amazonaws.com` `sns:Publish` access to the topic.

## Review Notes
- The main backup window resource arguments are technically correct for the Terraform AWS provider resources covered in the post.
- ElastiCache snapshot windows must be at least 60 minutes; the post's ElastiCache examples already use 60-minute windows.
- RDS, DocumentDB, Aurora, and Neptune backup windows are UTC daily time ranges and the examples use valid 30-minute windows.
