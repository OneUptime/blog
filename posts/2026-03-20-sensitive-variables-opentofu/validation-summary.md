# Validation Summary: How to Mark Variables as Sensitive in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu input variables and outputs
- OpenTofu sensitive values
- OpenTofu state and plan encryption
- OpenTofu S3 backend
- AWS Secrets Manager CLI
- HCL

## Sources Consulted
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu Output Values: https://opentofu.org/docs/language/values/outputs/
- OpenTofu `tofu output` command: https://opentofu.org/docs/cli/commands/output/
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu State and Plan Encryption: https://opentofu.org/docs/language/state/encryption/
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu Debugging: https://opentofu.org/docs/internals/debugging/
- AWS CLI `secretsmanager get-secret-value`: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html

## Issues Found
- The description incorrectly said sensitive variables prevent secrets from appearing in state files. Updated it to say sensitive variables redact normal CLI output and that state files still need protection.
- The introduction over-stated redaction by referring broadly to terminal logs. Updated it to match OpenTofu documentation: sensitive values are hidden from normal plan/apply output, but are still sent to providers and recorded in state.
- The resource example said the password was passed to the resource "safely," which could imply provider-side secrecy. Updated the comment to clarify that the value is redacted in normal plan/apply output.
- The environment variable example said secrets are not in shell history by default. Updated the comment because typing an `export` command interactively can still place the secret in shell history depending on shell configuration.
- Added a note that the PBKDF2 state encryption passphrase must be at least 16 characters, matching the OpenTofu encryption documentation.
- The conclusion said sensitive variables prevent accidental exposure in logs and terminal output. Updated it to the narrower and documented behavior: normal plan/apply output.

## Review Notes
The local environment did not have `tofu` or `terraform` installed, so CLI behavior was checked against official OpenTofu documentation rather than local command execution.
