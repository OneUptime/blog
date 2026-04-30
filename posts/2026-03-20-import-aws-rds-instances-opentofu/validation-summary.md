# Validation Summary: How to Import AWS RDS Instances into OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS RDS
- AWS CLI
- Terraform AWS provider resources for RDS

## Sources Consulted
- OpenTofu import blocks: https://opentofu.org/docs/language/import/
- AWS CLI `describe-db-instances` command reference: https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS RDS option groups documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithOptionGroups.html
- AWS RDS for PostgreSQL parameter documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Parameters.html
- Terraform AWS provider `aws_db_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider `aws_db_subnet_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS provider `aws_db_parameter_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_parameter_group
- Terraform AWS provider `aws_db_option_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_option_group
- Terraform AWS provider `aws_rds_cluster` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS provider `aws_rds_cluster_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Amazon Aurora versioning: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.VersionPolicy.Versioning.html
- Aurora PostgreSQL upgrade targets by version: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/USER_UpgradeDBInstance.PostgreSQL.UpgradeVersion.html

## Issues Found
- The introduction and description implied that subnet groups, parameter groups, and option groups must always be imported for every RDS instance. I corrected this to say these related resources are imported when you want OpenTofu to manage them, and that option groups are engine-specific.
- The post used PostgreSQL as its concrete example but still spoke generically about option groups. I added a clarification that PostgreSQL does not use DB option groups, so there is no option group resource to import in this example.
- The Step 1 discovery command did not gather several attributes that the later HCL example relies on. I expanded the `jq` projection to include storage encryption, DB name, master username, VPC security groups, deletion protection, backup settings, maintenance window, and the option group name when present.
- The `aws_db_instance` example incorrectly stated that `password` is not stored in state. I corrected this to match the provider docs: RDS does not return the current password from the API, but if `password` is set in configuration it is still stored in state.
- The conclusion overstated the outcome of parameter group and option group mismatches by saying they cause replacement. I corrected this to say they can cause unexpected planned updates, while some instance attributes can still force replacement.
- The Aurora example declared `count = 2` cluster instances but only imported one of them. I added the second `import` block so the example matches the declared resources.

## Review Notes
- The examples pin PostgreSQL and Aurora PostgreSQL to `15.4`. This is a valid example version, but it is not the current default minor version as of April 30, 2026. Readers should check available versions in their region with `aws rds describe-db-engine-versions` before copying the example verbatim.
