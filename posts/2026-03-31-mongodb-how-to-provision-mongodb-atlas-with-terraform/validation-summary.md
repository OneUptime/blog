# Validation Summary: How to Provision MongoDB Atlas with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- Terraform
- MongoDB Atlas Terraform Provider (`mongodb/mongodbatlas` ~> 1.15)
- AWS (VPC peering example)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Terraform Registry - mongodb/mongodbatlas provider: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest
- `mongodbatlas_cluster` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/cluster
- `mongodbatlas_advanced_cluster` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/advanced_cluster
- `mongodbatlas_project` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/project
- `mongodbatlas_database_user` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/database_user
- `mongodbatlas_project_ip_access_list` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/project_ip_access_list
- `mongodbatlas_network_peering` resource documentation: https://registry.terraform.io/providers/mongodb/mongodbatlas/latest/docs/resources/network_peering
- terraform-provider-mongodbatlas CHANGELOG: https://github.com/mongodb/terraform-provider-mongodbatlas/blob/master/CHANGELOG.md

## Issues Found

1. **Missing variable declarations for `db_password` and `readonly_password`**: The Database Users section referenced `var.db_password` and `var.readonly_password`, but these variables were never declared in the Variables section. This would cause a Terraform validation error. Added both variable declarations with `sensitive = true`.

2. **Deprecated `labels` block**: The `labels` attribute on `mongodbatlas_cluster` is deprecated in favor of `tags`. Changed `labels` to `tags` in the cluster resource definition.

3. **`terraform apply -auto-approve` missing variable flags**: The `terraform plan` command passed `-var` flags for API keys and org ID, but the `terraform apply -auto-approve` command did not. Without these variables (and without environment variables set), the apply would either fail or prompt for input, defeating the purpose of `-auto-approve`. Added the matching `-var` flags to the apply command.

## Review Notes
- The `mongodbatlas_cluster` resource is deprecated in the latest provider versions (2.x) in favor of `mongodbatlas_advanced_cluster`. Since this post pins to provider version `~> 1.15`, the code is functional, but readers should be aware that `mongodbatlas_advanced_cluster` is the recommended resource for new projects. A future update of this post to use `mongodbatlas_advanced_cluster` and provider version `~> 2.0` would be beneficial.
- The connection string output `mongodbatlas_cluster.main.connection_strings[0].standard_srv` is correct for the `mongodbatlas_cluster` resource.
- The `mongodbatlas_project_ip_access_list` resource name is correct (the older `mongodbatlas_project_ip_whitelist` name was deprecated).
- The VPC peering example references `aws_vpc.main.id` and `data.aws_caller_identity.current.account_id`, which are external AWS resources not defined in this post. This is acceptable since it's illustrative, but readers will need to define those AWS resources separately.
- The post correctly advises storing API keys as environment variables rather than in `.tfvars` files.
