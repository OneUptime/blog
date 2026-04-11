# Validation Summary: How to Provision MySQL with Terraform on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform (>= 1.5.0)
- AWS Provider for Terraform (~> 5.0)
- AWS RDS (MySQL 8.0)
- AWS VPC networking (subnet groups, security groups)
- AWS S3 backend for Terraform state
- AWS CloudWatch (log exports, enhanced monitoring)
- AWS KMS (encryption at rest)

## Sources Consulted
- AWS RDS Parameter Group Families documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html
- AWS RDS DB instance storage types (gp3 support): https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- AWS RDS MySQL CloudWatch log exports: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQLDB.PublishtoCloudWatchLogs.html
- AWS RDS parameter formulas and variables: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html
- Terraform AWS Provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_db_parameter_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS Provider `aws_db_subnet_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform `timestamp()` function behavior: https://developer.hashicorp.com/terraform/language/functions/timestamp

## Issues Found
No technical issues found.

## Review Notes
- The `final_snapshot_identifier` uses `timestamp()`, which is evaluated at plan time and produces a new value on every `terraform plan`. This causes a perpetual diff in the plan output even when nothing else has changed. A static identifier (e.g., `"${var.environment}-mysql-final"`) or a `random_id` resource would avoid this. This is a well-known Terraform gotcha (see hashicorp/terraform-provider-aws#16725) but not a correctness error.
- The `aws_iam_role.rds_monitoring` resource is referenced in the RDS instance but not defined in any code block. This is consistent with the post's approach of focusing on key resources while expecting readers to supply supporting resources (variables, locals, IAM roles) themselves, but readers should be aware they need to create this role separately.
- The master password is passed via `var.master_password`, which means it will be stored in plaintext in Terraform state. For production use, consider using `manage_master_user_password = true` (available in AWS provider v4.x+) to have RDS manage the password via AWS Secrets Manager instead.
- The configuration does not set `multi_az`, which defaults to `false`. For a production deployment, `multi_az = true` is strongly recommended for high availability.
- MySQL 8.0.35 is a valid RDS version but newer minor versions (8.0.36+) are available. The `auto_minor_version_upgrade = true` setting will handle upgrades automatically.
