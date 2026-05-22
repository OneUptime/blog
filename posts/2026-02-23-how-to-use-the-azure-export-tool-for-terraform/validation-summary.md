# Validation Summary: How to Use the Azure Export Tool for Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Export for Terraform (`aztfexport`)
- Terraform
- Terraform import blocks
- Azure CLI
- Azure Resource Graph queries
- AzureRM provider

## Sources Consulted
- Microsoft Learn: Azure Export for Terraform CLI overview: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-terraform-overview
- Microsoft Learn: Export your first resources using Azure Export for Terraform: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-first-resources
- Microsoft Learn: Export Azure resources into HCL code using Azure Export for Terraform: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-resources-hcl
- Microsoft Learn: Customized resource selection and naming using Azure Export for Terraform: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/select-custom-resources
- Microsoft Learn: Advanced Azure Export for Terraform scenarios: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-advanced-scenarios
- Azure/aztfexport GitHub repository and v0.19.0 release/CLI help output: https://github.com/Azure/aztfexport
- HashiCorp Terraform import language documentation: https://developer.hashicorp.com/terraform/language/import

## Issues Found
- The introduction described Azure Export for Terraform as "formerly aztfexport". Official documentation identifies `aztfexport` as the current CLI name, so this was changed to say the tool is invoked as `aztfexport`.
- The Homebrew install command used an outdated tap-style formula. Updated it to the current documented `brew install aztfexport`.
- The Linux apt example used the deprecated `apt-key` flow and an incorrect repository URL. Updated it to the Microsoft package repository pattern documented by the Azure/aztfexport project for supported Ubuntu versions.
- The prerequisites only mentioned Azure CLI authentication. Added Terraform in `PATH`, because `aztfexport` requires a Terraform executable.
- The output file list implied `import.tf` is always generated. Clarified that `import.tf` is generated when `--generate-import-block` is used and noted the generated mapping file.
- The import-block section said the tool generates import blocks "instead of directly manipulating state". Updated the wording to match Terraform's plannable import workflow without implying unsupported internal behavior.
- The skip example used a nonexistent `--skip` flag. Replaced it with the current `--exclude-azure-resource` flag, verified against `aztfexport v0.19.0 --help`.

## Review Notes
The remaining command examples and high-level workflow match the current `aztfexport` command structure. The generated Terraform examples are illustrative and may still require normal post-export cleanup for provider defaults, sensitive values, and production module structure.
