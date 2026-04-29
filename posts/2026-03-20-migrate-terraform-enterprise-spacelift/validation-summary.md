# Validation Summary: How to Migrate from Terraform Enterprise to Spacelift with OpenTofu

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Terraform Enterprise (TFE) / Terraform Cloud
- Spacelift (CI/CD platform for IaC)
- OpenTofu
- Spacelift Terraform provider (`spacelift-io/spacelift`)
- AWS S3 backend for OpenTofu state
- OPA / Rego policy-as-code
- Terraform Cloud REST API (v2)

## Sources Consulted
- Spacelift Terraform provider docs: https://registry.terraform.io/providers/spacelift-io/spacelift/latest/docs (specifically `spacelift_stack`, `spacelift_environment_variable`, `spacelift_policy`, `spacelift_policy_attachment`)
- Spacelift policy docs (Plan policies, OPA input schema): https://docs.spacelift.io/concepts/policy/
- Terraform Cloud / Enterprise API – State Versions: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/state-versions
- Terraform Cloud / Enterprise API – Workspaces and Variables: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces and `/workspace-variables`
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/

## Issues Found

1. **Invalid `spacelift_stack` attribute `opentofu_version`** — the Spacelift Terraform provider does not expose an `opentofu_version` attribute. To run a stack with OpenTofu you must set `terraform_workflow_tool = "OPEN_TOFU"` and specify the version with `terraform_version`. Fixed by replacing `opentofu_version = "1.9.0"` with `terraform_workflow_tool = "OPEN_TOFU"` and `terraform_version = "1.10.0"`.

2. **Invalid TFE state-download endpoint** — the post used `GET /api/v2/workspaces/:id/current-state-version/download`, which does not exist. The Terraform Cloud/Enterprise API requires a two-step flow: first `GET /api/v2/workspaces/:id/current-state-version` to retrieve metadata, then download the file from the `hosted-state-download-url` attribute returned in the JSON response. Fixed the curl example to do the metadata fetch (with `jq` to extract the URL) followed by the actual download.

3. **Version/feature mismatch** — the post originally specified OpenTofu `1.9.0` while the S3 backend block uses `use_lockfile = true`. S3-native locking via `use_lockfile` was introduced in OpenTofu 1.10 (mirroring Terraform 1.10), so it is unavailable in 1.9.0. Bumped the example version to `1.10.0` so the two snippets are internally consistent.

## Review Notes
- `write_only = true` on `spacelift_environment_variable` is correct for marking a variable as secret. Note that newer provider versions also expose `value_wo` / `value_wo_version` (Terraform 1.11+ ephemeral write-only arguments) for keeping the actual secret out of state — worth mentioning in a future revision but not strictly required.
- The OPA Rego sample uses the legacy `deny[msg] { ... }` partial-set syntax. This is still valid but Spacelift's `spacelift_policy` resource has gained an `engine_type` attribute that supports `REGO_V1` for Rego v1 syntax. Acceptable as written but worth flagging in future content.
- Spacelift `terraform_workflow_tool` accepts `OPEN_TOFU`, `TERRAFORM_FOSS`, or `CUSTOM`; the default is `TERRAFORM_FOSS`, so explicitly setting it is required when using OpenTofu.
- The TFE API examples for listing workspaces, fetching workspace details, and listing variables are accurate.
- The `spacelift_policy` `type = "PLAN"` value is correct (note `TERRAFORM_PLAN` is a deprecated alias of `PLAN`).
