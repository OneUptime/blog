# Validation Summary: How to Manage Version Constraints in Terraform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform configuration language
- Terraform CLI
- Terraform providers
- Terraform modules
- Terraform dependency lock file
- Renovate
- GitHub Dependabot

## Sources Consulted
- HashiCorp Terraform version constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform `providers lock` command reference: https://developer.hashicorp.com/terraform/cli/commands/providers/lock
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform provider block reference: https://developer.hashicorp.com/terraform/language/block/provider
- HashiCorp Terraform providers within modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- HashiCorp Terraform 1.5 release announcement for import blocks and check blocks: https://www.hashicorp.com/en/blog/terraform-1-5-brings-config-driven-import-and-checks
- Renovate configuration options documentation: https://docs.renovatebot.com/configuration-options/
- GitHub Dependabot supported ecosystems documentation: https://docs.github.com/code-security/dependabot/ecosystems-supported-by-dependabot/supported-ecosystems-and-repositories

## Issues Found
- The provider-version warning said `terraform init` downloads the latest provider version without constraints. Updated it to clarify that this applies when there is no existing lock file selection, because Terraform uses `.terraform.lock.hcl` selections when present.
- The unconstrained provider example said "uses latest." Updated the comment to "uses latest unless locked" for the same lock-file reason.
- The conflict-resolution section suggested using provider aliases for different versions. Replaced it with a warning not to use aliases for this purpose, because aliases configure multiple instances of the same selected provider version and Terraform selects a single compatible version for each provider source across the configuration.
- The best-practices section described pessimistic constraints as allowing patches while preventing major/minor surprises. Updated it to distinguish `~> 1.5.0`, which allows patch updates, from `~> 1.5`, which allows minor updates.

## Review Notes
Terraform was not installed in the local environment, so CLI behavior was verified against official HashiCorp command documentation rather than local `terraform --help` output. The remaining examples and commands are consistent with current Terraform documentation.
