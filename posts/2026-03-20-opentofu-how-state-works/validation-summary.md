# Validation Summary: How State Works in OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu (state file format, backends, workspaces, locking)
- Terraform (compatible state format)
- AWS S3 + DynamoDB (remote state backend with locking)
- Azure Storage (azurerm backend)
- Google Cloud Storage (gcs backend)
- HCL configuration syntax
- JSON state file format

## Sources Consulted
- OpenTofu Backends Configuration: https://opentofu.org/docs/language/settings/backends/configuration/
- OpenTofu S3 Backend: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Local Backend: https://opentofu.org/docs/language/settings/backends/local/
- OpenTofu Refresh Command: https://opentofu.org/docs/cli/commands/refresh/
- OpenTofu Provider Registry Protocol: https://opentofu.org/docs/internals/provider-registry-protocol/
- OpenTofu What's New: https://opentofu.org/docs/intro/whats-new/

## Issues Found
- **"OpenTofu Cloud" backend example was incorrect.** The post showed a `cloud { organization ... workspaces { ... } }` block labeled as "OpenTofu Cloud". OpenTofu does not run a cloud service called "OpenTofu Cloud". While the `cloud` block syntax exists in OpenTofu, it is used to connect to TACOS providers (Terraform Automation and Collaboration Software, like Spacelift, Scalr, or HCP Terraform), not a service operated by OpenTofu. Replaced this example with an `azurerm` backend example, which is a real built-in OpenTofu backend, to keep the section diverse and accurate.

## Review Notes
- The state file JSON example uses provider address `registry.opentofu.org/hashicorp/aws`, which is the correct format for OpenTofu (the OpenTofu registry mirrors HashiCorp providers under that namespace).
- The `tofu refresh` command shown in the "Refreshing State" section is technically deprecated in favor of `tofu apply -refresh-only`, but the post already shows both forms with `-refresh-only` highlighted, so this is acceptable. A future revision could explicitly note the deprecation.
- The S3 backend example uses `dynamodb_table` for locking, which is still supported. Newer OpenTofu versions also support S3-native locking via the `use_lockfile` option as an alternative, but DynamoDB-based locking remains valid and widely used.
- All other commands (`tofu plan`, `tofu apply`, `tofu workspace new/select/list`, `tofu force-unlock`) and their flags are accurate.
- The local backend `path` field, S3 backend fields (`bucket`, `key`, `region`, `encrypt`, `kms_key_id`), and GCS backend fields (`bucket`, `prefix`) all match official documentation.
