# Validation Summary: How to Import Azure Resources into OpenTofu with aztfexport

## Status
validated

## Post Type
Guide

## Technologies Covered
- Azure Export for Terraform (`aztfexport`)
- Microsoft Azure
- Azure Resource Manager
- Azure Resource Graph
- Terraform
- OpenTofu
- Azure Blob Storage backend (`azurerm`)

## Sources Consulted
- Azure Export for Terraform GitHub repository: https://github.com/Azure/aztfexport
- Azure Export for Terraform overview: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-terraform-overview
- Export Azure resources into HCL code using Azure Export for Terraform: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-resources-hcl
- Azure Export for Terraform concepts: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-terraform-concepts
- Customized resource selection and naming using Azure Export for Terraform: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/select-custom-resources
- Using Azure Export for Terraform in advanced scenarios: https://learn.microsoft.com/en-us/azure/developer/terraform/azure-export-for-terraform/export-advanced-scenarios
- OpenTofu `azurerm` backend documentation: https://opentofu.org/docs/language/settings/backends/azurerm/
- `aztfexport` CLI flags and command definitions: https://github.com/Azure/aztfexport/blob/main/main.go
- `aztfexport` output file and backend behavior: https://github.com/Azure/aztfexport/blob/main/internal/meta/base_meta.go
- `aztfexport` Terraform binary discovery: https://github.com/Azure/aztfexport/blob/main/internal/meta/tfinstall_find.go

## Issues Found
- The Linux install command was incorrect. The post used `https://aka.ms/aztfexport/install.sh`, which no longer resolves to an installer. I replaced it with official upstream installation methods documented by the `aztfexport` project.
- The `resource-group` example used stale argument ordering and an incomplete output file list. I moved the scope argument to the documented position after the flags and corrected the generated files to include `terraform.tf` alongside `main.tf`, `provider.tf`, and `terraform.tfstate`.
- The "Export Specific Resource Types" section did not match the example shown. The example exports a single resource by resource ID, so I renamed the section and adjusted the wording accordingly.
- The Azure Resource Graph query used exact-match operators that were less robust than the documented case-insensitive query style. I updated the example to use `=~` so it better matches official guidance.
- The post implied that `aztfexport` directly operates as an OpenTofu-native workflow. I clarified that the tool itself officially expects a `terraform` binary on `PATH`, while the generated files can still be reviewed and validated with OpenTofu afterwards.
- The rename example only updated references like `azurerm_virtual_network.res-0` and did not rename the resource block declaration itself. I corrected the command so it renames both the declaration and the references.
- The `sed -i` examples were not portable between GNU `sed` and BSD/macOS `sed`. I changed them to use `sed -i.bak` and remove the backup file afterwards.
- The backend section said "S3 or Azure Blob" but only showed an `azurerm` backend example. I narrowed the wording to Azure Blob so the explanation matches the snippet.

## Review Notes
- `aztfexport` remains documented by Microsoft as a Terraform-oriented tool, not an OpenTofu-native one. The post is still usable for OpenTofu readers once that distinction is made explicit.
- If this post is later expanded to cover `--generate-import-block` or `--hcl-only`, it should also document the additional generated files such as `import.tf`, `aztfexportResourceMapping.json`, and `aztfexportSkippedResources.txt`.
