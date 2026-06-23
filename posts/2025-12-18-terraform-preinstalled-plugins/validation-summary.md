# Validation Summary: How to Use Pre-Installed Terraform Plugins Without terraform init

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform provider installation configuration
- Terraform filesystem mirrors
- Terraform network mirrors
- Terraform plugin cache
- Terraform dependency lock files
- Docker
- GitHub Actions
- GitLab CI
- Nginx

## Sources Consulted
- Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform `providers mirror` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform `providers lock` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- Terraform provider network mirror protocol reference: https://developer.hashicorp.com/terraform/internals/provider-network-mirror-protocol
- Terraform providers language documentation: https://developer.hashicorp.com/terraform/language/providers
- Terraform plugin architecture documentation: https://developer.hashicorp.com/terraform/plugin/how-terraform-works
- GitHub Actions cache action repository: https://github.com/actions/cache
- HashiCorp setup-terraform GitHub Marketplace page: https://github.com/marketplace/actions/hashicorp-setup-terraform
- HashiCorp provider release URLs for the AWS, AzureRM, Google, and Kubernetes versions used in the examples.

## Issues Found
- The post title, description, and introduction implied that filesystem mirrors allow users to avoid running `terraform init`. Terraform mirrors are installation sources used by `terraform init`; they avoid provider downloads from upstream registries but do not generally remove the need to initialize the working directory. Updated the wording to describe avoiding internet downloads during `terraform init`.
- The implied local mirror example used the old flat `~/.terraform.d/plugins/linux_amd64/` layout. Current Terraform implied mirrors use the same filesystem mirror layouts as explicit `filesystem_mirror` blocks. Updated the example to use `~/.terraform.d/plugins/registry.terraform.io/hashicorp/aws/5.31.0/linux_amd64/`.
- The GitHub Actions example used `actions/cache@v3`. Current GitHub guidance recommends `actions/cache@v4`, so the workflow example was updated to `actions/cache@v4`.
- The network mirror setup comment said the mirror serves providers via HTTP, but Terraform network mirror base URLs must use HTTPS. Updated the comment to HTTPS.
- The lock-file section only showed regenerating lock entries from origin registries. Added the documented `terraform providers lock -fs-mirror=...` pattern for providers that are available only from a filesystem mirror.

## Review Notes
- Terraform was not installed in the local environment, so command behavior was verified against official Terraform documentation rather than local `terraform --help` output.
- The provider release ZIP URLs used by the download script returned HTTP 200 during review.
- The Docker and CI examples intentionally use Terraform 1.6-era versions. They remain syntactically valid, but future updates could move examples to a newer Terraform release and `hashicorp/setup-terraform@v4`.
