# Validation Summary: How to Handle Terragrunt Version Management

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terragrunt
- tgenv
- tfenv
- asdf
- GitHub Actions
- Docker
- HCL
- Bash

## Sources Consulted
- Terragrunt HCL attributes reference: https://docs.terragrunt.com/reference/hcl/attributes/
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terraform `terraform` block reference: https://developer.hashicorp.com/terraform/language/terraform
- Terraform dependency lock file reference: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform provider requirements reference: https://developer.hashicorp.com/terraform/language/providers/requirements
- hashicorp/setup-terraform README: https://github.com/hashicorp/setup-terraform
- tfenv README: https://github.com/tfutils/tfenv
- tgenv README: https://github.com/cunymatthieu/tgenv
- asdf plugin documentation: https://asdf-vm.com/manage/plugins.html
- asdf configuration documentation: https://asdf-vm.com/manage/configuration.html

## Issues Found
- The post incorrectly stated that Terragrunt does not have a built-in version constraint mechanism. Updated the text and HCL example to use `terragrunt_version_constraint` and `terraform_version_constraint`, which are documented Terragrunt attributes.
- The post described Terraform version constraints in Terragrunt as only possible through generated `versions.tf`. Updated the section to explain both Terragrunt's own CLI constraint attributes and Terraform's generated `required_version` check.
- The Terragrunt examples used the deprecated `run-all` command. Updated them to the current `terragrunt run --all` form, including argument separation for `init -upgrade`.
- The GitHub Actions example used `hashicorp/setup-terraform@v3`. Updated it to the current `@v4` major version documented by HashiCorp.
- The GitHub Actions Terragrunt install snippets wrote directly to `/usr/local/bin`, which can fail on hosted runners if the path is not writable. Updated them to download to `/tmp` and install with `sudo install`.
- Version examples were updated from older Terragrunt and Terraform releases to current exact-version examples so the pinned versions match the modern CLI syntax used in the post.

## Review Notes
The CI snippets download Terragrunt directly from GitHub release assets, which is technically plausible, but production workflows may also want checksum verification or a maintained setup action. The `tgenv` project still documents `.terragrunt-version`, but it is a community tool with limited recent activity; teams may prefer asdf, mise, or tenv for newer workflows.
