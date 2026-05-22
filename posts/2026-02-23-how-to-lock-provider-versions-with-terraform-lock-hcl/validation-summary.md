# Validation Summary: How to Lock Provider Versions with .terraform.lock.hcl

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform provider dependency lock files
- Terraform provider version constraints
- GitHub Actions

## Sources Consulted
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform providers lock command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- HashiCorp Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- HashiCorp Terraform providers within modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- GitHub Marketplace: hashicorp/setup-terraform: https://github.com/marketplace/actions/hashicorp-setup-terraform
- GitHub repository: actions/checkout: https://github.com/actions/checkout
- GitHub repository: peter-evans/create-pull-request: https://github.com/peter-evans/create-pull-request

## Issues Found
- The post had the meanings of `h1:` and `zh:` provider hashes reversed. Updated the explanation so `h1:` is described as Terraform's preferred content-based package hash scheme, and `zh:` as the legacy zip hash scheme for official provider `.zip` packages.
- The post stated that running `terraform init` on one platform simply adds hashes for that platform and that another teammate's platform hashes are added later. Updated this to reflect Terraform's documented behavior: registry installs can pre-populate signed `zh:` hashes for available packages, while `h1:` hashes are added as Terraform verifies packages.
- The post described missing platform hashes too broadly. Updated the verification failure example to clarify that this is most relevant when the lock file was generated through an installation method that did not record checksums for the target platform, such as some mirror-based workflows.
- The GitHub Actions snippets used older major versions of `actions/checkout` and `peter-evans/create-pull-request`. Updated `actions/checkout@v4` to `actions/checkout@v6` and `peter-evans/create-pull-request@v6` to `peter-evans/create-pull-request@v8` based on the current action documentation/repositories.

## Review Notes
Terraform CLI was not installed in the local environment, so CLI behavior was verified against official HashiCorp documentation instead of local `--help` output. The remaining Terraform commands and HCL snippets are consistent with the official documentation.
