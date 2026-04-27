# Validation Summary: How to Publish a Module to the OpenTofu Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Terraform (HCL)
- OpenTofu Registry
- GitHub (repository hosting, releases, tags)
- Git (semantic versioning via tags)

## Sources Consulted
- OpenTofu Module Registry Protocol — https://opentofu.org/docs/internals/module-registry-protocol/
- OpenTofu Registry repository (README) — https://github.com/opentofu/registry
- OpenTofu Registry inclusion policy — https://github.com/opentofu/registry/blob/main/POLICY.md
- OpenTofu Registry "Submit new Module" issue template — https://raw.githubusercontent.com/opentofu/registry/main/.github/ISSUE_TEMPLATE/module.yml (confirms `{owner}/terraform-{target}-{name}` repo naming pattern)
- OpenTofu standard module structure — https://opentofu.org/docs/language/modules/develop/structure/

## Issues Found
- **Incorrect publishing process.** The original "Registering on the OpenTofu Registry" section described a Terraform Registry-style flow ("Sign in to registry.opentofu.org", "Click Publish > Module", "Click Publish Module"). The OpenTofu Registry does not work that way — it has no in-site publish button. Per the `opentofu/registry` repo README and the `Submit new Module` issue template, submissions must be made by opening an issue on `github.com/opentofu/registry` using the structured "Submit new Module" template, with the repository specified in the form pattern `{owner}/terraform-{target}-{name}`. Pull requests, `gh` CLI–created issues, and API-created issues are explicitly not accepted. The section was rewritten to reflect the real submission flow and to note that subsequent semver-tagged releases are detected automatically once a module is accepted.

## Review Notes
- Repository naming pattern (`terraform-<PROVIDER>-<NAME>`) is correct — verified directly against the official issue form's `module_repository` field description.
- Module address format `registry.opentofu.org/myorg/vpc/aws` is correct (`hostname/namespace/name/system`, where the system / "target" is the primary provider).
- The HCL examples (`terraform { required_version ... required_providers { aws = { source = "hashicorp/aws" ... } } }`, `variable` with `validation { condition / error_message }`, `output "vpc_id" { ... }`) are syntactically valid and use current, non-deprecated language features. Using a `terraform { ... }` block in OpenTofu is intentional and correct for cross-compatibility (a `tofu { ... }` alias also exists, but the `terraform` block remains the canonical form and works identically).
- The standard module file layout shown (`main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`, `README.md`, `examples/`) matches the OpenTofu standard module structure.
- Git tag examples (`git tag v1.0.0`, `git tag -a v1.0.0 -m`, `git push origin --tags`) and semver progression are accurate.
- The post does not mention that an open-source license file at the repository root is required for inclusion per the registry policy — this is worth adding in a future revision but is not a technical inaccuracy in what is currently written.
