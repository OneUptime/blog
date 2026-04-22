# Validation Summary: How to Mark Outputs as Sensitive in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTofu output values
- OpenTofu sensitive values
- OpenTofu CLI output command
- OpenTofu state storage
- OpenTofu S3 backend
- HCL
- Kubernetes `kubectl create secret`

## Sources Consulted
- OpenTofu Output Values: https://opentofu.org/docs/language/values/outputs/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu References to Named Values: https://opentofu.org/docs/language/expressions/references/
- OpenTofu `tofu output` command: https://opentofu.org/docs/cli/commands/output/
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu Settings: https://opentofu.org/docs/language/settings/
- OpenTofu S3 backend: https://opentofu.org/docs/language/settings/backends/s3/

## Issues Found
- The description and introduction overstated sensitive output redaction as covering logs and terminal output generally. Updated them to match OpenTofu's documented behavior: normal plan/apply messages and default `tofu output` redacts sensitive values, but `tofu output -raw`, `tofu output -json`, and `tofu output -show-sensitive` can display them.
- The `api_key_length` comment said `length()` does not reveal the key. Updated it to say it does not reveal the key contents, since the length itself is still information derived from the secret.
- The named sensitive output example showed `tofu output database_password` returning only `<sensitive>`. Updated it to match the current OpenTofu CLI documentation, which shows the output name with the redacted marker.
- The private key command referenced `private_key`, but the output declared earlier in the post is named `private_key_pem`. Updated the command to use `private_key_pem`.
- The private key example said it saved to an encrypted file, but the commands only write a plaintext file and restrict permissions with `chmod 600`. Updated the comment to describe restricted permissions instead of encryption.
- The conclusion over-stated prevention of exposure in logs, CI/CD output, and terminals. Updated it to the narrower documented behavior of helping prevent accidental exposure in normal CLI output and CI/CD logs.

## Review Notes
The local environment did not have `tofu` or `terraform` installed, so CLI behavior was checked against official OpenTofu documentation rather than local command execution. The S3 backend example uses the `terraform` settings block, which is still the correct OpenTofu settings block name according to the OpenTofu documentation.
