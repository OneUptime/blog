# Validation Summary: How to Create RDS Instances with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS RDS
- Amazon RDS for PostgreSQL
- Terraform
- HashiCorp AWS Provider
- AWS Secrets Manager
- AWS KMS
- AWS IAM
- Amazon RDS Enhanced Monitoring

## Sources Consulted
- Terraform AWS Provider `aws_db_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS Provider `aws_db_parameter_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Amazon RDS password management with AWS Secrets Manager: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
- Amazon RDS Enhanced Monitoring setup documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Monitoring.OS.Enabling.html
- Amazon RDS for PostgreSQL parameter documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Parameters.html
- Amazon RDS read replica documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- Amazon RDS for PostgreSQL read replica configuration documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.Configuration.html

## Issues Found
- The production RDS example used `timestamp()` inside `final_snapshot_identifier`. Terraform documents that `timestamp()` changes every second and causes diffs when used directly in resource attributes. Replaced it with a stable final snapshot identifier.
- The PostgreSQL parameter group configured static parameters without `apply_method = "pending-reboot"`. The AWS provider defaults parameter `apply_method` to `immediate`, while RDS for PostgreSQL static parameters such as `shared_preload_libraries` require a reboot. Added `apply_method = "pending-reboot"` to `max_connections` and `shared_preload_libraries`.
- The `manage_master_user_password` explanation implied password rotation no longer needs consideration. AWS RDS manages the master password secret and supports rotation through RDS/Secrets Manager, but the important Terraform benefit is keeping the master password out of state. Updated the sentence to reflect that behavior.

## Review Notes
The snippets are example fragments and reference surrounding resources or variables that are not fully defined in the post, such as `var.private_subnet_ids`, `var.vpc_id`, `aws_kms_key.rds`, and `aws_iam_role.rds_monitoring`. That is acceptable for a focused tutorial, but a complete module would need those definitions. Terraform was not installed in the local environment, so validation was performed by checking the snippets against current official Terraform AWS Provider and AWS RDS documentation rather than running `terraform validate`.
