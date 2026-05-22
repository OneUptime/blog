# Validation Summary: How to Handle Terraform Provider Supply Chain Security

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- Terraform providers
- Terraform dependency lock files
- Terraform CLI provider mirror and lock commands
- Terraform CLI provider installation configuration
- Terraform provider signing
- HCP Terraform and Terraform Enterprise private provider registries
- Sentinel policy language
- Open Policy Agent and Rego
- Conftest
- Dependabot and Renovate

## Sources Consulted
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform CLI `providers lock` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- Terraform CLI `providers mirror` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/mirror
- Terraform CLI configuration and `provider_installation` documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform provider plugin signing documentation: https://developer.hashicorp.com/terraform/cli/plugins/signing
- Terraform provider network mirror protocol reference: https://developer.hashicorp.com/terraform/internals/provider-network-mirror-protocol
- Terraform provider registry protocol reference: https://developer.hashicorp.com/terraform/internals/provider-registry-protocol
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HashiCorp Sentinel `tfconfig/v2` import reference: https://developer.hashicorp.com/sentinel/docs/features/terraform/tfconfig-v2
- Open Policy Agent policy language documentation: https://www.openpolicyagent.org/docs/policy-language
- Conftest documentation: https://www.conftest.dev/
- GitHub Dependabot Terraform ecosystem support documentation: https://docs.github.com/en/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories
- HashiCorp releases page for `terraform-provider-aws` v5.31.0: https://releases.hashicorp.com/terraform-provider-aws/5.31.0/

## Issues Found
- The sample `.terraform.lock.hcl` excerpt included realistic-looking hashes that did not match the published AWS provider v5.31.0 checksum list. The incorrect hashes were replaced with an actual `zh:` checksum from HashiCorp Releases for the `linux_amd64` package.
- The lock file explanation said every user gets "exactly the same provider binary." That is imprecise for multi-platform teams because the lock file can record different package checksums for different operating system and architecture targets. It now says the lock file records the selected provider version and expected checksummed package for each platform.
- The private registry section described the example as a "network mirror" while the configuration used `filesystem_mirror`. The wording now calls it a filesystem mirror.
- The `terraform providers mirror` example introduced a `-platform=linux_amd64` command as "mirror specific providers." The command mirrors the providers required by the current configuration for a specific target platform, so the wording was corrected.
- The vulnerability monitoring section implied `tfsec`, `checkov`, and `snyk` maintain databases of known issues with specific Terraform provider versions. That is not accurate for `tfsec` and `checkov`, which primarily scan Terraform configuration for infrastructure security issues. The text now recommends Dependabot or Renovate for provider update tracking and keeps those scanners scoped to configuration security checks.
- The Sentinel code block was marked as `python`. The fence was corrected to `sentinel`.
- The Sentinel `tfconfig/v2` policy used `provider.source`, but the documented field for a provider's fully-qualified source address is `provider.full_name`. The policy now checks `provider.full_name`.
- The OPA/Rego policy used pre-OPA-v1 partial set syntax (`deny[msg]`) and an undocumented Conftest Terraform input shape (`input.terraform.required_providers`). It was updated to Rego v1 syntax using `deny contains msg if` and checks documented Terraform plan JSON provider configuration at `input.configuration.provider_config`.

## Review Notes
- Terraform CLI was not installed in the local environment, so command validation was performed against official HashiCorp command documentation and protocol references rather than local `terraform --help` output.
- The provider signature verification example uses files that exist for `terraform-provider-aws` v5.31.0 on HashiCorp Releases. In production, teams should verify the signing key fingerprint through their own trusted process before trusting an imported GPG key.
