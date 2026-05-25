# Validation Summary: How to Create RDS MySQL Instance in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- HashiCorp Random provider
- Amazon RDS for MySQL
- Amazon VPC security groups and DB subnet groups
- AWS Secrets Manager
- Amazon CloudWatch metrics

## Sources Consulted
- Terraform AWS provider `aws_db_instance` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- Terraform AWS provider `aws_db_parameter_group` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_parameter_group.html.markdown
- Terraform AWS provider `aws_secretsmanager_secret` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret.html.markdown
- Terraform AWS provider `aws_secretsmanager_secret_version` resource documentation: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret_version.html.markdown
- Terraform Random provider `random_password` resource documentation: https://github.com/hashicorp/terraform-provider-random/blob/main/docs/resources/password.md
- Amazon RDS quotas and constraints, including MySQL master password limits: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Limits.html
- Amazon RDS for MySQL parameter documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MySQL.Parameters.html
- Amazon RDS for MySQL log and redo log size documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.LogFileSize.html

## Issues Found
- The provider configuration used the `random_password` resource later in the post but did not declare the Random provider in `required_providers`. Added the `hashicorp/random` provider declaration so the complete example is explicit.
- The MySQL 8.0.36 parameter group used `innodb_log_file_size`. Amazon RDS uses `innodb_redo_log_capacity` for RDS for MySQL 8.0.33 and later, so the parameter name and comment were updated.
- The Secrets Manager example generated a random password and stored it in the secret, but the RDS instance still used `var.db_password`. Added the corresponding `password = random_password.mysql.result` setting so the stored secret matches the actual database password.
- The credentials section implied that generating and storing a password in Secrets Manager avoids the Terraform state concern entirely. Clarified that the generated password is still stored in Terraform state when using `random_password` and `password`.

## Review Notes
- The examples use the current Terraform AWS provider arguments for RDS instances, DB subnet groups, DB parameter groups, Secrets Manager secrets, and secret versions.
- The RDS master password character set in the random password example avoids the characters AWS disallows for RDS master passwords.
- Terraform AWS provider documentation now includes `password_wo` and RDS-managed master passwords as newer options for reducing password exposure in state, but the post's approach remains technically valid with the added state warning.
