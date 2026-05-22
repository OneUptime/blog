# Validation Summary: How to Understand OpenTofu vs Terraform Differences

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- OpenTofu
- Terraform
- HCL configuration
- Terraform/OpenTofu providers and registries
- Terraform/OpenTofu state files
- Terragrunt and infrastructure-as-code tooling

## Sources Consulted
- OpenTofu FAQ: https://opentofu.org/faq/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/language/state/encryption/
- OpenTofu 1.8 release notes for early variable/locals evaluation: https://opentofu.org/docs/v1.8/intro/whats-new/
- OpenTofu provider configuration documentation for provider `for_each`: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu OCI registry documentation: https://opentofu.org/docs/cli/oci_registries/module-package/ and https://opentofu.org/docs/cli/oci_registries/provider-mirror/
- OpenTofu import block documentation: https://opentofu.org/docs/language/import/
- OpenTofu migration documentation: https://opentofu.org/docs/intro/migration/migration-guide/
- Terraform provider-defined functions documentation: https://developer.hashicorp.com/terraform/plugin/framework/functions
- Terraform Stacks documentation: https://developer.hashicorp.com/terraform/language/stacks
- Terraform import block reference: https://developer.hashicorp.com/terraform/language/block/import
- HashiCorp license FAQ: https://www.hashicorp.com/en/license-faq
- IBM acquisition completion announcement: https://newsroom.ibm.com/2025-02-27-ibm-completes-acquisition-of-hashicorp,-creates-comprehensive,-end-to-end-hybrid-cloud-platform
- Linux Foundation OpenTofu launch announcement: https://www.linuxfoundation.org/press/announcing-opentofu

## Issues Found
- The post said HashiCorp was part of IBM after a 2024 acquisition. IBM announced the acquisition in 2024 but completed it on February 27, 2025, so the wording was corrected.
- The BSL description said it restricts competitive use of Terraform. HashiCorp's FAQ frames the restriction around competitive offerings built with HashiCorp products, so the wording was made more precise.
- Provider-defined functions were listed as unique to OpenTofu, but Terraform supports provider-defined functions in Terraform 1.8 and later. The OpenTofu-only bullet was replaced with provider iteration.
- The `for_each with Count Results` item was not a clear OpenTofu-only feature and conflicted with current Terraform/OpenTofu behavior around `count`, `for_each`, and import blocks. It was replaced with OpenTofu OCI registry support.
- The Terraform import block item was too vague. It was updated to mention current Terraform improvements such as `for_each` imports and identity-based imports.
- The command compatibility and configuration compatibility text was too absolute. It was softened to reflect that the tools are highly compatible but have version-specific differences.
- The registry fallback note referred to "direct downloads", which is not the usual provider installation mechanism. It was corrected to filesystem or network mirrors.

## Review Notes
The post remains a high-level comparison rather than a migration runbook. The core code snippets for OpenTofu state encryption, early variable evaluation in backend configuration, common provider source syntax, state inspection, and `-parallelism` usage are consistent with the official documentation for the versions discussed.
