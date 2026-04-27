# Validation Summary: How to Plan and Preview Imports Before Applying in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (`tofu` CLI)
- Terraform import blocks (HCL `import { to = ..., id = ... }`)
- AWS provider (`aws_s3_bucket` resource used as the running example)
- `jq` for JSON plan analysis

## Sources Consulted
- OpenTofu JSON plan format documentation: https://opentofu.org/docs/internals/json-format/
- Terraform JSON plan format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- OpenTofu `tofu plan` command reference: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu import block documentation: https://opentofu.org/docs/language/import/
- OpenTofu `-generate-config-out` flag documentation (part of import workflow)

## Issues Found
1. **Incorrect jq filter for detecting imports in JSON plan output.** The post used `select(.change.actions[] == "import")` to filter imported resources. This matches nothing — `"import"` is not a valid value in the `actions` array. Per the OpenTofu/Terraform JSON plan format spec, valid action values are `no-op`, `create`, `read`, `update`, `delete`, `forget`, and the replacement combinations. Imports are signaled by a separate `importing` field on the change object (containing the import `id`), and the `actions` array for a clean import is typically `["no-op"]` or `["update"]` if there is drift. Replaced with `select(.change.importing != null)` and added the `import_id` and `actions` projections so the filter actually surfaces imported resources.

## Review Notes
- The HCL `import` block syntax, the `aws_s3_bucket.existing` example, and the `-generate-config-out=generated.tf` flag are all correct and current.
- `tofu plan -out=...`, `tofu show <planfile>`, `tofu show -json <planfile>`, and `tofu apply <planfile>` are all valid commands and accurately described.
- The illustrative plan output ("Plan: 1 to import, 0 to add, …") is representative of OpenTofu's actual output format. Real output formatting may vary slightly between versions but the post's claims about the summary line are accurate.
- The drift-detection example (`force_destroy = false -> true`) correctly conveys the behavior; OpenTofu does combine import with an in-place update when configuration differs from the real resource.
