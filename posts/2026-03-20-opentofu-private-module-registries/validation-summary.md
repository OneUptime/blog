# Validation Summary: How to Use Private Module Registries with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (CLI configuration via `.tofurc`, module sources, registry protocol)
- Terraform (`.terraformrc`, equivalent CLI config)
- HCP Terraform (private module registry on `app.terraform.io`)
- Self-hosted module registries (Terrareg, Tapir, Spacelift)
- GitHub Actions (CI/CD example)

## Sources Consulted
- OpenTofu CLI Configuration: https://opentofu.org/docs/cli/config/config-file/
- Terraform CLI Configuration: https://developer.hashicorp.com/terraform/cli/config/config-file
- OpenTofu Module Sources: https://opentofu.org/docs/language/modules/sources/
- Terraform Module Registry Protocol: https://developer.hashicorp.com/terraform/internals/module-registry-protocol
- Terraform Remote Service Discovery: https://developer.hashicorp.com/terraform/internals/remote-service-discovery
- HCP Terraform Private Registry: https://developer.hashicorp.com/terraform/cloud-docs/registry/using
- Terrareg: https://github.com/MatthewJohn/terrareg
- Tapir: https://github.com/PacoVK/tapir

## Issues Found

1. **Incorrect `TF_TOKEN_*` environment variable encoding for hyphens.** The post originally claimed both `.` and `-` are replaced with a single `_`, and showed `TF_TOKEN_registry_acme_corp_com` for the hostname `registry.acme-corp.com`. Per the official Terraform/OpenTofu CLI config docs, periods become a single underscore (`_`) but hyphens may be encoded as a *double* underscore (`__`). Updated the example to `TF_TOKEN_registry_acme__corp_com` and clarified the encoding rules.

2. **Air-gapped section conflated "provider mirror" with service discovery override.** The post said "configure the registry as a provider mirror and serve modules locally," then showed a `host` block. A `host` block overrides service discovery — it is not a provider mirror (which is a distinct `provider_installation` mechanism). Reworded to describe the snippet correctly as a service-discovery override.

3. **Unnecessary `mkdir -p ~/.config/opentofu` in the GitHub Actions example.** The heredoc writes to `~/.tofurc` (in the home directory), not into `~/.config/opentofu/`, so the `mkdir` did nothing relevant. Removed it to keep the example minimal and correct.

## Review Notes
- The `host` block syntax used in the air-gapped section is correct in practice but is not formally documented in either the OpenTofu or Terraform CLI configuration reference (HashiCorp issue hashicorp/terraform#28309 tracks the documentation gap). Readers may want to consult community references when extending it.
- HCP Terraform was renamed from Terraform Cloud; the post correctly notes this.
- Terrareg, Tapir, and Spacelift are all real, established options as listed.
