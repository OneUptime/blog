# Validation Summary: How to Use Dynamic Blocks for Database Parameter Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform AWS provider
- AWS RDS DB parameter groups
- AWS RDS cluster parameter groups
- Amazon RDS for PostgreSQL
- Amazon Aurora MySQL

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints#optional-object-type-attributes
- Terraform AWS provider `aws_db_parameter_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_parameter_group.html.markdown
- Terraform AWS provider `aws_rds_cluster_parameter_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster_parameter_group.html.markdown
- AWS RDS parameter groups documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithParamGroups.html
- AWS RDS DB parameter values and formulas documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ParamValuesRef.html
- AWS RDS for PostgreSQL parameter documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Parameters.html
- AWS RDS for PostgreSQL memory documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Tuning.concepts.memory.html
- Amazon Aurora MySQL parameter documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.ParameterGroups.html

## Issues Found
- The `shared_buffers` examples used `{DBInstanceClassMemory/4}` and described it as 25% of instance memory. RDS for PostgreSQL reports `shared_buffers` in 8 KB pages, and AWS documents the 25% default formula as `{DBInstanceClassMemory/32768}`. Updated the production and locals examples accordingly.
- The `effective_cache_size` examples used `{DBInstanceClassMemory*3/4}` and described it as 75% of instance memory. RDS for PostgreSQL reports `effective_cache_size` in 8 KB pages, so the formula needs to divide by 32768 after multiplying by 3. Updated the production and locals examples to `{DBInstanceClassMemory*3/32768}`.
- The post marked `max_wal_size` as requiring `pending-reboot`, but AWS documents `max_wal_size` for RDS for PostgreSQL as dynamic. Removed the explicit `pending-reboot` setting and removed it from the automatic reboot-required parameter list.
- The mandatory parameter example marked `rds.force_ssl` as `pending-reboot`, but AWS documents `rds.force_ssl` for RDS for PostgreSQL as dynamic. Changed its `apply_method` to `immediate`.

## Review Notes
- The Terraform dynamic block patterns, optional attribute defaults, `parameter` block fields, and supported `apply_method` values match current Terraform and Terraform AWS provider documentation.
- The Aurora MySQL cluster-level and instance-level parameter examples use parameters documented by AWS for Aurora MySQL and the correct Terraform resources for cluster and instance parameter groups.
