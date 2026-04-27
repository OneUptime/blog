# Validation Summary: How to Use TF_LOG for Debugging in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (v1.6+, with examples pinning to 1.7.0)
- TF_LOG environment variable (logging levels: INFO, DEBUG)
- HCL (HashiCorp Configuration Language)
- AWS provider (`hashicorp/aws` ~> 5.0)
- S3 + DynamoDB remote state backend
- GitHub Actions (CI/CD automation)
- `opentofu/setup-opentofu@v1`
- `aws-actions/configure-aws-credentials@v4`

## Sources Consulted
- OpenTofu CLI debugging docs: https://opentofu.org/docs/internals/debugging/
- OpenTofu CLI reference (`tofu init`, `tofu plan`, `tofu apply`, `tofu show`, `tofu state`): https://opentofu.org/docs/cli/
- OpenTofu S3 backend reference: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu input variables / validation: https://opentofu.org/docs/language/values/variables/
- `opentofu/setup-opentofu` GitHub Action: https://github.com/opentofu/setup-opentofu
- `actions/upload-artifact` deprecation notice (v3 deprecated, use v4): https://github.com/actions/upload-artifact
- `actions/download-artifact` deprecation notice (v3 deprecated, use v4): https://github.com/actions/download-artifact
- `aws-actions/configure-aws-credentials` v4: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- `actions/upload-artifact@v3` was deprecated and the v3 endpoints were shut down in early 2025. Updated to `actions/upload-artifact@v4`.
- `actions/download-artifact@v3` was likewise deprecated and removed; updated to `actions/download-artifact@v4`.

## Review Notes
- The post's title focuses on `TF_LOG` debugging, but the body is largely a generic OpenTofu workflow walkthrough; `TF_LOG` is only mentioned in Step 1 and Troubleshooting. This is a content/scope concern, not a technical-accuracy one, so no edits were made. A future revision could expand on the available log levels (`TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`, `JSON`, `OFF`), `TF_LOG_CORE`/`TF_LOG_PROVIDER` split, and `TF_LOG_PATH` for file output.
- `tofu_version: "1.7.0"` is a valid pin but is not the latest OpenTofu series as of 2026-04. Pinning is a deliberate choice and not incorrect.
- `actions/upload-artifact@v4` has known incompatibilities with `v3` (artifacts cannot be merged across versions, names must be unique per workflow run). For this single-job artifact pattern, the upgrade is drop-in.
- The HCL, backend config, provider block, and CLI commands are all syntactically and semantically correct against current OpenTofu documentation.
