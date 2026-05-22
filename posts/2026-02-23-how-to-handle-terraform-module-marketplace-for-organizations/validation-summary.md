# Validation Summary: How to Handle Terraform Module Marketplace for Organizations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform modules
- HCP Terraform/Terraform Enterprise private registry
- Terraform module source addresses
- Terraform version constraints
- Terraform variable validation
- GitHub Actions
- GitHub CODEOWNERS
- YAML
- Python

## Sources Consulted
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform registry module usage: https://developer.hashicorp.com/terraform/registry/modules/use
- HCP Terraform private registry overview: https://docs.hashicorp.com/terraform/cloud-docs/registry
- HCP Terraform private module publishing: https://developer.hashicorp.com/terraform/cloud-docs/registry/publish-modules
- Terraform version constraints reference: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform validate command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp setup-terraform GitHub Action: https://github.com/marketplace/actions/hashicorp-setup-terraform
- GitHub CODEOWNERS documentation: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners

## Issues Found
- The private registry examples used the older "Terraform Cloud" name. Updated those references to "HCP Terraform" while keeping Terraform Enterprise references intact, matching current HashiCorp documentation.
- The GitHub Actions workflow used `hashicorp/setup-terraform@v3`. Updated it to the current documented major version, `hashicorp/setup-terraform@v4`.
- The CODEOWNERS example was fenced as YAML even though CODEOWNERS is not YAML. Changed the fence to `text`.
- The pull request template example was fenced as YAML even though it is Markdown. Changed the fence to `markdown`.
- The deprecated module example used `condition = false` in a Terraform variable validation block. Verified with Terraform 1.5.7 that this fails configuration validation because the condition must reference the validated variable. Changed it to `length(var.deprecated_warning) < 0`, which references the variable and still intentionally fails during planning.

## Review Notes
The S3 module source, private registry source address format, Git module `ref` usage, module version constraints, CODEOWNERS owner syntax, and `terraform fmt -check -recursive` / `terraform validate` workflow usage are consistent with the consulted documentation.
