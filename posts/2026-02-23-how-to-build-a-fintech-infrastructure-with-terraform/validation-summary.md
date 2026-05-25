# Validation Summary: How to Build a FinTech Infrastructure with Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- AWS VPC and security groups
- AWS KMS
- AWS Secrets Manager
- Amazon Aurora PostgreSQL and pgAudit
- Amazon SQS FIFO queues
- AWS WAF
- AWS CloudTrail
- Amazon GuardDuty
- Amazon CloudWatch alarms
- Amazon SNS

## Sources Consulted
- Terraform AWS Provider documentation for `aws_flow_log`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform AWS Provider documentation for `aws_cloudtrail`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudtrail
- Terraform AWS Provider documentation for `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider documentation for `aws_secretsmanager_secret_rotation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_rotation
- Terraform AWS Provider documentation for `aws_guardduty_detector`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/guardduty_detector
- AWS KMS API documentation for automatic key rotation: https://docs.aws.amazon.com/kms/latest/APIReference/API_EnableKeyRotation.html
- AWS SQS documentation for FIFO exactly-once processing and deduplication: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- AWS Aurora PostgreSQL documentation for CloudWatch log exports: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.CloudWatch.Publishing.html
- AWS Aurora PostgreSQL documentation for pgAudit setup: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Appendix.PostgreSQL.CommonDBATasks.pgaudit.basic-setup.html
- AWS Aurora PostgreSQL documentation for pgAudit object auditing: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Appendix.PostgreSQL.CommonDBATasks.pgaudit.auditing.html
- AWS CloudTrail API documentation for `DataResource`: https://docs.aws.amazon.com/awscloudtrail/latest/APIReference/API_DataResource.html
- AWS WAFV2 API documentation for `RateBasedStatement`: https://docs.aws.amazon.com/waf/latest/APIReference/API_RateBasedStatement.html

## Issues Found
- The post claimed Terraform code makes it impossible to create unencrypted resources. I changed this to say Terraform makes encryption requirements explicit and repeatable, because enforcement requires additional controls such as policy-as-code, service control policies, or constrained modules.
- The architecture list mentioned AWS Config, but the post did not configure Config. I changed the bullet to CloudTrail only.
- The application security group referenced `aws_security_group.redis.id`, but no Redis security group or Redis component was included in the post. I removed that egress rule.
- The Aurora section implied that the Terraform parameter group alone enables full pgAudit logging. I added the required caveat that the `pgaudit` extension must be created in the database after the parameter group is applied and the writer instance is rebooted.
- The SQS section said FIFO queues ensure transactions are processed exactly once. I changed this to the more precise AWS behavior: FIFO queues preserve order and help prevent duplicate enqueues within the deduplication interval.
- The CloudTrail comment described the setup as tamper-proof logging. I changed it to log file validation, which is what `enable_log_file_validation` actually provides.
- The wrapping-up claims that KMS encrypts everything, audit logging captures every action, and Terraform codifies every security control were narrowed to match the resources actually shown.

## Review Notes
The Terraform snippets are illustrative and still depend on supporting resources not shown in the article, such as IAM roles and policies, CloudWatch log groups, an RDS subnet group, a secret rotation Lambda, an S3 audit log bucket and bucket policy, and at least one Aurora cluster instance or serverless configuration. I did not run `terraform validate` because the post is not a complete standalone Terraform module.
