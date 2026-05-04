# Validation Summary: How to Configure Random Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (>= 1.6.0)
- HashiCorp Random provider (`hashicorp/random`, v3.6+)
- HCL configuration language

## Sources Consulted
- OpenTofu Random provider registry: https://search.opentofu.org/provider/hashicorp/random
- Terraform Random provider docs: https://registry.terraform.io/providers/hashicorp/random/latest/docs
- Random provider GitHub repository: https://github.com/hashicorp/terraform-provider-random
- Resource references for `random_password`, `random_string`, `random_id`, `random_integer`, `random_pet`, `random_uuid`

## Issues Found
The original post was a generic provider template that did not actually describe the Random provider. Specific problems:

1. **Wrong provider source**: The `required_providers` block used placeholder `provider_name = { source = "provider-namespace/provider-name" }` instead of `random = { source = "hashicorp/random" }`. Fixed by using the correct source and a current version constraint (`~> 3.6`).
2. **Fabricated authentication section**: The post described setting `PROVIDER_API_KEY` / `PROVIDER_API_SECRET` environment variables. The Random provider is a local utility provider with no external service and no authentication. Replaced with a "Provider Configuration" note that the provider takes no configuration.
3. **Placeholder resource example**: `provider_example_resource` with `tags` does not exist. Replaced with real Random provider resources: `random_password`, `random_string`, `random_id`, `random_integer`, `random_pet`, and `random_uuid`, each with accurate arguments per the schema (e.g. `length`, `special`, `override_special`, `byte_length`, `min`/`max`, `separator`).
4. **Missing core feature - `keepers`**: The post omitted `keepers`, which is the primary mechanism for controlling regeneration of random values. Added a section showing its use.
5. **Inaccurate framing**: The introduction and conclusion described "Random resources" as "SaaS tooling" - which is meaningless. Reworded to accurately describe the provider's role: producing stable random values (suffixes, passwords, ports, identifiers) that participate in the plan/apply lifecycle.
6. **Misleading best practice**: Removed the "Store API keys in environment variables" bullet (no API keys exist) and replaced with guidance about treating `random_password.result` as a secret in state, since the Random provider stores generated values in state in plaintext.
7. **Output example**: Updated outputs to reference real attributes (`random_id.bucket_suffix.hex`, `random_password.db.result` marked `sensitive = true`).

## Review Notes
- Random provider 3.7.x is also current as of 2026; the `~> 3.6` constraint accepts both 3.6.x and 3.7.x, which is the safer pin.
- `random_password` and `random_string` both store their generated `result` in state. For `random_password`, the value is automatically marked sensitive; users should still ensure the state backend is encrypted.
- `random_shuffle` (a data-shuffling resource) was intentionally omitted to keep the post focused on the most commonly used resources.
- The provider is published under `hashicorp/random` and is included with OpenTofu's standard registry mirroring; no authentication or registry token is required.
