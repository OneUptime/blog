# Validation Summary: How to Use Environment Variables in HCP Terraform Workspaces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HCP Terraform workspaces
- HCP Terraform workspace variables and variable sets
- HCP Terraform API
- Terraform CLI environment variables
- AWS, Azure, and Google Cloud Terraform provider authentication
- HCP Terraform dynamic provider credentials

## Sources Consulted
- HCP Terraform workspace variables API reference: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HCP Terraform variable sets API reference: https://developer.hashicorp.com/terraform/enterprise/api-docs/variable-sets
- HCP Terraform manage variables and variable sets documentation: https://developer.hashicorp.com/terraform/cloud-docs/variables/managing-variables
- Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- Terraform debug logging documentation: https://developer.hashicorp.com/terraform/internals/debugging
- HCP Terraform dynamic provider credentials overview: https://developer.hashicorp.com/terraform/cloud-docs/dynamic-provider-credentials
- HCP Terraform AWS dynamic credentials documentation: https://developer.hashicorp.com/terraform/cloud-docs/dynamic-provider-credentials/aws-configuration
- HCP Terraform Azure dynamic credentials documentation: https://developer.hashicorp.com/terraform/cloud-docs/dynamic-provider-credentials/azure-configuration
- HCP Terraform GCP dynamic credentials documentation: https://developer.hashicorp.com/terraform/cloud-docs/dynamic-provider-credentials/gcp-configuration
- AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AzureRM provider service principal authentication documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret
- Google provider documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs

## Issues Found
- The UI instructions referred to the left sidebar and the Environment Variables section. Current HCP Terraform docs describe using the workspace Variables tab, clicking Add variable in Workspace Variables, and choosing the variable category. Updated the steps to match current UI documentation.
- The workspace variable update API example omitted the required `data.id` field in the PATCH payload. Added `"id": "var-VARIABLE_ID"` to match the official API schema.
- The Azure dynamic credentials example only included `TFC_AZURE_RUN_CLIENT_ID`. HCP Terraform docs also require AzureRM configuration to receive subscription and tenant values through provider arguments or workspace environment variables. Added `ARM_SUBSCRIPTION_ID` and `ARM_TENANT_ID`.
- The GCP dynamic credentials example omitted the required workload identity provider configuration. Added `TFC_GCP_WORKLOAD_PROVIDER_NAME` alongside the existing provider auth and service account email variables.

## Review Notes
The examples intentionally use placeholder credentials and IDs. In production, static cloud credentials should be avoided where possible in favor of HCP Terraform dynamic provider credentials, as the post recommends.
