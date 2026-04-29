# Validation Summary: How to Migrate State Between Backends in OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (CLI: `tofu`)
- Terraform-compatible HCL backend configuration
- AWS S3 backend (with DynamoDB locking)
- Google Cloud Storage (GCS) backend
- Local backend
- Terraform Cloud / OpenTofu Cloud (briefly mentioned)
- AWS CLI (`aws s3 mv`)

## Sources Consulted
- OpenTofu CLI `init` command reference: https://opentofu.org/docs/cli/commands/init/
- OpenTofu backend configuration documentation: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu S3 backend documentation: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu GCS backend documentation: https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu state subcommand documentation (`state pull`, `state push`, `state list`)

## Issues Found

1. **Step 3 incorrectly described `tofu init` as auto-prompting for migration without flags.** Per the OpenTofu CLI docs for `init`: "Either `-reconfigure` or `-migrate-state` must be supplied to update the backend configuration." A bare `tofu init` against a changed backend errors out and instructs the user to pass one of those flags. Only after `-migrate-state` is supplied does the interactive "Do you want to copy existing state..." prompt appear.
   - **Fix:** Updated Step 3 to use `tofu init -migrate-state` and clarified that the flag is required when the backend configuration has changed. Also updated the Conclusion section to reference `tofu init -migrate-state` consistently.

## Review Notes

- The S3 backend example uses `dynamodb_table` for state locking, which remains supported. OpenTofu also supports native S3 conditional-write locking via `use_lockfile = true`, which removes the DynamoDB dependency. The post's approach is still valid; mentioning the modern alternative could be a future improvement but is not a technical error.
- All other commands (`tofu state pull`, `tofu state push`, `tofu state list`, `tofu show -json`, `tofu plan`) and flags (`-force-copy`, `-reconfigure`) are accurate.
- The `terraform { backend "..." { ... } }` block syntax is correctly used — OpenTofu retains the `terraform` block name (it does not use `tofu { ... }`).
- The GCS backend configuration with `bucket` and `prefix` matches the official documentation.
- The interactive prompt wording quoted in the post matches OpenTofu's actual output closely enough to serve as a representative example.
