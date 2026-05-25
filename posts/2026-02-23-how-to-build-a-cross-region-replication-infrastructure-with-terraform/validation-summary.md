# Validation Summary: How to Build a Cross-Region Replication Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS provider for Terraform
- Amazon S3 cross-region replication
- Amazon DynamoDB global tables
- Amazon Aurora global databases
- Amazon ECR replication
- AWS Secrets Manager replication
- Amazon CloudWatch alarms and replication metrics
- AWS KMS encryption for replicated resources

## Sources Consulted
- Terraform AWS provider documentation for `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Amazon S3 replication requirements and considerations: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-and-other-bucket-configs.html
- Amazon S3 metrics and replication dimensions: https://docs.aws.amazon.com/AmazonS3/latest/userguide/metrics-dimensions.html
- Terraform AWS provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Amazon DynamoDB global tables documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.CrossRegionRepl.html
- Amazon DynamoDB global table monitoring documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_monitoring.html
- Amazon DynamoDB metrics and dimensions documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- Terraform AWS provider documentation for `aws_rds_global_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- Amazon Aurora global database supported engines and Regions: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.GlobalDatabase.html
- Amazon Aurora CloudWatch metrics documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Terraform AWS provider documentation for `aws_ecr_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_replication_configuration
- Terraform AWS provider documentation for `aws_secretsmanager_secret`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- AWS Secrets Manager replica Region documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-secretsmanager-secret-replicaregion.html

## Issues Found
- The post description referred to ECS, but the article and Terraform example cover ECR container image replication. Changed ECS to ECR.
- The introductory availability claim said cross-region replication "ensures" availability during a regional outage. Replication is a component of disaster recovery, but availability also depends on failover, routing, application deployment, and operational readiness. Changed the wording to "helps keep" availability.
- The S3 architecture and section text described bidirectional replication, but the Terraform snippet configures only primary-to-secondary replication. Updated the wording to primary-to-secondary replication and clarified that S3 CRR applies to new eligible objects and object changes.
- The ECR replication snippet referenced `data.aws_caller_identity.current.account_id` without defining the data source. Added `data "aws_caller_identity" "current" {}` to the snippet.
- The DynamoDB replication-lag alarm was configured in the secondary provider while its dimensions track primary-to-secondary replication with `ReceivingRegion = var.secondary_region`. Updated the alarm provider to `aws.primary`.

## Review Notes
- Several snippets intentionally reference surrounding infrastructure not shown in the post, such as KMS keys, subnet groups, security groups, variables, and SNS topics. This is acceptable for a focused replication tutorial, but a complete working module would need those definitions.
- The S3 example uses customer-managed KMS keys. In production, the KMS key policies must also allow the S3 replication role to decrypt source objects and encrypt destination replicas.
- The Aurora examples pin Aurora PostgreSQL `15.4`, which AWS has supported, but newer Aurora PostgreSQL minor versions are available as of this review. A production module should select an engine version available in both target Regions and keep it current.
- For multi-active DynamoDB global tables, production monitoring should consider replication-lag alarms for each write Region and receiving Region pair, not only primary-to-secondary replication.
