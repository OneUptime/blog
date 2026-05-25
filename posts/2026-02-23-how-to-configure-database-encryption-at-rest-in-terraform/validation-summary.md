# Validation Summary: How to Configure Database Encryption at Rest in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS KMS
- Amazon RDS for PostgreSQL
- Amazon Aurora PostgreSQL
- Amazon DynamoDB
- Amazon ElastiCache for Redis
- Amazon DocumentDB
- Amazon Neptune
- Amazon EventBridge
- Amazon SNS

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp Terraform AWS Provider documentation for `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- HashiCorp Terraform AWS Provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- HashiCorp Terraform AWS Provider documentation for `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- HashiCorp Terraform AWS Provider documentation for `aws_docdb_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/docdb_cluster
- HashiCorp Terraform AWS Provider documentation for `aws_neptune_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/neptune_cluster
- HashiCorp Terraform AWS Provider documentation for `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Amazon RDS encryption documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- Amazon DynamoDB encryption at rest documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html
- Amazon DynamoDB encryption usage notes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/encryption.usagenotes.html
- AWS KMS EventBridge event documentation: https://docs.aws.amazon.com/kms/latest/developerguide/kms-events.html
- AWS KMS pending deletion alarm documentation: https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys-creating-cloudwatch-alarm.html
- Amazon RDS for PostgreSQL release notes and release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- Amazon Aurora PostgreSQL release notes and release calendar: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html
- Amazon Neptune engine release documentation: https://docs.aws.amazon.com/neptune/latest/userguide/engine-releases.html

## Issues Found
- The opening claim said the guide covered encryption across all major AWS database services and implied all AWS managed database services have the same backup, snapshot, and read replica encryption behavior. Changed this to "many" and "several major" services to avoid overgeneralizing across services with different feature models.
- The Terraform AWS provider constraint used `~> 5.0`, while the current official provider line is 6.x. Updated the example to `~> 6.0`.
- The RDS and Aurora PostgreSQL examples pinned `15.4`, which has reached end of standard support for RDS for PostgreSQL and is no longer a good current tutorial default. Updated both examples to `15.17`, a current supported PostgreSQL 15 minor version in AWS release notes.
- The DynamoDB default encryption example used `server_side_encryption { enabled = true }` while describing the default AWS-owned key. In Terraform, that block without `kms_key_arn` selects the AWS managed DynamoDB KMS key, not the AWS-owned default. Removed the block and clarified that DynamoDB encryption is enabled by default with an AWS-owned key.
- The Neptune example pinned engine version `1.3.1.0`, which is not the latest active release. Updated it to `1.4.7.0`, the current active Neptune engine release documented by AWS.
- The KMS monitoring example created a CloudWatch alarm on the SNS `NumberOfMessagesPublished` metric, which would not detect KMS key deletion scheduling. Replaced it with an EventBridge rule for `ScheduleKeyDeletion`, an SNS target, and an SNS topic policy allowing EventBridge to publish.

## Review Notes
- Terraform was not installed in the review environment, so the examples were not run through `terraform validate`. The review was performed against current official AWS and HashiCorp provider documentation.
- The examples still refer to surrounding resources such as subnet groups and security groups that are intentionally outside the article scope.
