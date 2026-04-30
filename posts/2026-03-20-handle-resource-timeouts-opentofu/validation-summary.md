# Validation Summary: How to Handle Resource Timeouts in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Provider
- Google Provider
- AzureRM Provider

## Sources Consulted
- OpenTofu Resource Blocks: https://opentofu.org/docs/language/resources/syntax/
- AWS provider `aws_db_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_eks_cluster` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown
- AWS provider `aws_elasticache_cluster` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/elasticache_cluster.html.markdown
- AWS provider `aws_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- Google provider `google_sql_database_instance` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/sql_database_instance.html.markdown
- AzureRM provider `azurerm_kubernetes_cluster` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/kubernetes_cluster.html.markdown
- Terraform import overview: https://developer.hashicorp.com/terraform/cli/import
- Terraform state overview: https://developer.hashicorp.com/terraform/language/state

## Issues Found
- The post said the `timeouts` block supports three optional fields. I changed this to provider-defined operations such as `create`, `read`, `update`, and `delete`, because timeout support is resource-specific and the AKS example in the post already used `read`.
- The AWS defaults table had incorrect values. I corrected `aws_db_instance` delete from `40m` to `60m`, and corrected `aws_instance` to `create 10m`, `read 15m`, `update 10m`, and `delete 20m` to match the current provider docs.
- The timeout-exceeded section implied that a create timeout always leaves a partially-created resource and that import or destroy/recreate are always the required next steps. I revised this to instruct readers to inspect both the cloud resource and OpenTofu state first, because the remote object may still exist and may or may not already be tracked in state.

## Review Notes
- Timeout support, supported operations, and default values are provider-specific and can change between provider versions. If this post is updated later, the linked provider docs should be rechecked.
