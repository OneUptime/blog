# Validation Summary: How to Use Remote State Data Sources to Share Data Between Configs

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- `terraform_remote_state`
- OpenTofu S3 backend
- OpenTofu GCS backend
- AWS IAM
- OpenTofu state encryption

## Sources Consulted
- OpenTofu docs: The `terraform_remote_state` Data Source - https://opentofu.org/docs/language/state/remote-state-data/
- OpenTofu docs: Backend Type: s3 - https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu docs: Backend Type: gcs - https://opentofu.org/docs/language/settings/backends/gcs/
- OpenTofu docs: State and Plan Encryption - https://opentofu.org/docs/language/state/encryption/

## Issues Found
- The S3 backend example used the deprecated top-level `role_arn` field in the `config` object. I changed it to `assume_role = { role_arn = ... }` to match the current OpenTofu backend documentation.
- The caveat about sensitive data said the reader gets access to all outputs. I corrected it to reflect the documented behavior: although the data source exposes only root outputs in configuration, backend access still allows access to the full state snapshot.

## Review Notes
- The post's explanation that `terraform_remote_state` reads outputs from another configuration, and the S3 and GCS backend examples, are consistent with current OpenTofu documentation after the fixes above.
- OpenTofu also documents extra caution for encrypted remote state shared across projects because encryption metadata must be coordinated. The post remains technically valid without expanding on that point.
