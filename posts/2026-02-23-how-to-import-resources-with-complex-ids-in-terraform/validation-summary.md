# Validation Summary: How to Import Resources with Complex IDs in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and import blocks
- HashiCorp AWS provider
- HashiCorp AzureRM provider
- HashiCorp Google provider
- AWS, Azure, and Google Cloud resource identifiers
- Azure CLI and Google Cloud CLI lookup commands

## Sources Consulted
- Terraform import command reference: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform import block reference: https://developer.hashicorp.com/terraform/language/block/import
- Terraform import resources overview: https://developer.hashicorp.com/terraform/language/import
- AWS provider aws_security_group_rule resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider aws_route_table_association resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- AWS provider aws_iam_role_policy_attachment resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- AWS provider aws_iam_user_policy resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_user_policy
- AWS provider aws_route53_record resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- AWS provider aws_lambda_permission resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AzureRM provider azurerm_linux_virtual_machine resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- AzureRM provider azurerm_network_security_rule resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule
- AzureRM provider azurerm_key_vault_secret resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/key_vault_secret
- AzureRM provider azurerm_role_assignment resource documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Google provider google_compute_instance resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Google provider google_compute_firewall resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Google provider google_sql_database resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database
- Google provider google_project_iam_member resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- Google provider google_storage_bucket and google_storage_bucket_acl resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket and https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_acl

## Issues Found
- AWS security group rule examples used colon-delimited IDs. The AWS provider documents underscore-delimited import IDs in the form `security_group_id_type_protocol_from_port_to_port_source`, so the common pattern, AWS examples, import block example, and related comments were updated.
- AWS route table association examples used `subnet-id/association-id`. The AWS provider documents the legacy import ID as associated resource ID and route table ID separated by `/`, so the examples were changed to `subnet-.../rtb-...`.
- The common Azure pipe-delimited example used `azurerm_network_security_rule`, but that resource imports using its full ARM resource ID. The example was changed to a full network security rule resource ID.
- The GCP section showed `google_storage_bucket_acl` as importable with a bucket name, but the Google provider documentation states that `google_storage_bucket_acl` does not support import. The example was changed to `google_storage_bucket`, which imports by bucket name.
- The GCP introductory sentence said resources often use a project/region/name format, but the examples include zones and global resources. It was adjusted to project/location/name.

## Review Notes
- Terraform was not installed in the local environment, so CLI syntax was checked against official Terraform documentation rather than local `terraform --help` output.
- The AWS provider now documents Terraform v1.12+ identity-based import blocks for some resources while retaining legacy `id` examples. The post's `id` examples remain valid for the import block workflow it demonstrates.
- AWS provider documentation recommends newer `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for many security group rule use cases, but `aws_security_group_rule` remains documented and importable.
