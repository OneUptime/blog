# Validation Summary: How to Implement Security Baselines with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS S3
- AWS RDS
- AWS VPC Flow Logs
- AWS CloudWatch Logs
- AWS Config managed rules
- Open Policy Agent / Rego

## Sources Consulted
- Terraform AWS Provider documentation for `aws_s3_bucket`, `aws_s3_bucket_public_access_block`, `aws_s3_bucket_server_side_encryption_configuration`, `aws_s3_bucket_versioning`, `aws_s3_bucket_logging`, `aws_s3_bucket_lifecycle_configuration`, `aws_db_instance`, `aws_flow_log`, `aws_cloudwatch_log_group`, `aws_default_security_group`, and `aws_config_config_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform language documentation for the `max` function: https://developer.hashicorp.com/terraform/language/functions/max
- Terraform module source syntax and Git `ref` parameter documentation: https://developer.hashicorp.com/terraform/language/block/module
- Terraform JSON plan format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- Open Policy Agent Rego policy language and Terraform integration documentation: https://www.openpolicyagent.org/docs/policy-language and https://www.openpolicyagent.org/docs/terraform
- Open Policy Agent Rego `if` keyword documentation: https://www.openpolicyagent.org/docs/policy-reference/keywords/if
- AWS RDS encryption documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html
- AWS RDS IAM database authentication documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html
- AWS Config managed rule documentation for `S3_BUCKET_SERVER_SIDE_ENCRYPTION_ENABLED`: https://docs.aws.amazon.com/config/latest/developerguide/s3-bucket-server-side-encryption-enabled.html
- AWS Config managed rule documentation for `RDS_STORAGE_ENCRYPTED`: https://docs.aws.amazon.com/config/latest/developerguide/rds-storage-encrypted.html
- AWS Config managed rule documentation for `VPC_FLOW_LOGS_ENABLED`: https://docs.aws.amazon.com/config/latest/developerguide/vpc-flow-logs-enabled.html

## Issues Found
- The Rego policy used pre-OPA-1.0 partial set syntax (`deny[msg]`) and omitted `import rego.v1`. Updated the snippet to use `deny contains msg if`, which is compatible with current Rego syntax.
- The Rego policy called `has_encryption(resource)` but did not define `has_encryption`. Added a helper that checks for a matching `aws_s3_bucket_server_side_encryption_configuration`.
- The Rego policy attempted `contains(flow_log.change.after_unknown.vpc_id, vpc_address)`. Terraform plan `after_unknown` stores unknown leaf values as booleans, so this was not a valid way to correlate a flow log to a VPC. Replaced it with helpers that check known `resource_changes` values and Terraform configuration references.
- The RDS module enabled IAM database authentication unconditionally even though Amazon RDS IAM database authentication is supported only for specific engines. Updated the example to enable it only for MySQL, PostgreSQL, and MariaDB engines, and adjusted the explanatory bullet accordingly.

## Review Notes
The examples remain illustrative modules and omit some production details, such as full module variable definitions, IAM roles and policies for VPC Flow Logs, access logging permissions on the S3 log destination bucket, and engine-specific RDS log export values. Those omissions are acceptable for the scope of the post, but a production module should document and validate those inputs.
