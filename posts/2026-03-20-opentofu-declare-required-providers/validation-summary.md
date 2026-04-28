# Validation Summary: How to Declare Required Providers in OpenTofu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform (HCL configuration language)
- Provider registry (registry.opentofu.org)
- Common providers: hashicorp/aws, hashicorp/kubernetes, hashicorp/helm, cloudflare/cloudflare, DataDog/datadog
- Version constraint operators (`~>`, `=`, `>=`)

## Sources Consulted
- OpenTofu Provider Requirements docs: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `tofu providers` CLI command docs: https://opentofu.org/docs/cli/commands/providers/
- OpenTofu version constraints documentation

## Issues Found
No technical issues found.

Verified:
- The `terraform { required_providers { ... } }` block syntax is correct.
- Source address format `[<HOSTNAME>/]<NAMESPACE>/<TYPE>` matches official docs; `registry.opentofu.org` is the default when hostname is omitted.
- The `~> 5.0` pessimistic constraint correctly allows minor and patch updates within the 5.x series.
- The `tofu init` and `tofu providers` commands and their behavior are accurate.
- Lock file path `.terraform.lock.hcl` and provider download path `.terraform/providers/` are correct.
- The shown `tofu providers` tree output ("Providers required by configuration: ... └── provider[registry.opentofu.org/hashicorp/aws] ~> 5.0") matches the documented format.
- Provider source addresses for AWS, Kubernetes, Helm, Cloudflare, and Datadog are all valid and use the correct namespaces.

## Review Notes
- The full `tofu providers` output may also include a "Providers required by state:" section when state exists; the post only shows the configuration-required portion, which is acceptable for an introductory example.
- The comment "Development: allow minor updates" for `~> 5.0` is slightly imprecise — `~> 5.0` actually allows both minor and patch increments within the 5.x major version. This is a minor wording nuance, not a technical error, so no edit was made.
- The recommendation in the conclusion to colocate `required_providers` with `required_version` in a `versions.tf` file aligns with widely accepted OpenTofu/Terraform community conventions.
