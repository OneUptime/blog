# Validation Summary: How to Use Sentinel for Multi-Cloud Governance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform policy enforcement
- Sentinel policy language
- Sentinel `tfplan/v2` import
- AWS Terraform provider
- AzureRM Terraform provider
- Google Cloud Terraform provider
- Multi-cloud governance and policy as code

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform AWS provider default tags tutorial: https://developer.hashicorp.com/terraform/tutorials/aws/aws-default-tags
- Terraform Registry AWS provider tagging guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/resource-tagging
- Terraform Registry AzureRM `azurerm_storage_account` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- Terraform Registry AzureRM `azurerm_managed_disk` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/managed_disk
- Terraform Registry AzureRM `azurerm_mssql_database` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/mssql_database
- Terraform Registry AzureRM `azurerm_network_security_rule` resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/network_security_rule
- Terraform Registry Google `google_sql_database_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Registry Google `google_compute_disk` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_disk
- Terraform Registry Google `google_compute_firewall` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Referenced OneUptime links in the article were opened and verified as resolving.

## Issues Found
- The code fences were labeled as `python` even though the examples are Sentinel policies. Changed the fences to `sentinel` so readers and renderers do not treat the examples as Python.
- The tagging helper checked `tags` before `tags_all`, which could fail AWS resources that rely on provider-level `default_tags`. Updated the helper to prefer `tags_all` and to use `else null` when reading optional plan attributes.
- The Azure SQL examples used the legacy `azurerm_sql_database` resource name. Updated the examples to use current `azurerm_mssql_database`.
- The Azure Storage encryption policy used the superseded `enable_https_traffic_only` field. Updated it to `https_traffic_only_enabled`.
- The Azure managed disk encryption policy checked `encryption_settings`, which is not the current field to enforce customer-managed disk encryption. Updated it to check `disk_encryption_set_id`.
- The GCP Cloud SQL encryption policy only checked that `settings` existed and did not actually validate encryption. Updated it to require `encryption_key_name`.
- The network security policy did not catch AWS IPv6 public ingress or all-protocol ingress, missed Azure plural fields such as `source_address_prefixes` and `destination_port_ranges`, and did not handle port ranges like `1000-2000` in Azure or GCP rules. Added a Sentinel helper for port-range checks and updated the AWS/Azure/GCP logic.
- The region policy imported `strings` after declarations. Sentinel imports must appear at the top of the source file, so the import was moved next to the `tfplan/v2` import.
- Optional region attribute reads could evaluate to `undefined`. Updated those reads to use `else null` before comparison.

## Review Notes
- The policies are illustrative examples and still intentionally cover selected resource types rather than every taggable, encryptable, or network-related resource in each provider.
- The encryption examples now enforce customer-managed-key style fields for some cloud resources. That is stricter than baseline provider defaults, but it is a valid governance policy when organizations require explicit encryption configuration.
