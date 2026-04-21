# Validation Summary: How to Use the TF_ENCRYPTION Environment Variable in OpenTofu - Variable

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu state and plan encryption
- TF_ENCRYPTION environment variable
- HCL and JSON OpenTofu configuration syntax
- PBKDF2 key provider
- AES-GCM encryption method
- AWS KMS key provider
- GitHub Actions
- GitLab CI
- HashiCorp Vault CLI

## Sources Consulted
- OpenTofu State and Plan Encryption documentation: https://opentofu.org/docs/v1.11/language/state/encryption/
- OpenTofu Environment Variables documentation (`TF_ENCRYPTION`): https://opentofu.org/docs/cli/config/environment-variables/
- OpenTofu JSON Configuration Syntax documentation: https://opentofu.org/docs/v1.11/language/syntax/json/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu setup GitHub Action README/releases: https://github.com/opentofu/setup-opentofu
- GitLab CI/CD script syntax documentation: https://docs.gitlab.com/ci/yaml/script/
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- HashiCorp Vault CLI tutorial / KV command documentation: https://developer.hashicorp.com/vault/tutorials/get-started/learn-cli

## Issues Found
- The GitHub Actions example used `opentofu/setup-opentofu@v1`, while the current OpenTofu setup action documentation uses `@v2`. Updated the workflow to `opentofu/setup-opentofu@v2`.
- The GitLab CI heredoc used `<<'EOF'`, which prevents `$STATE_PASSPHRASE` from expanding and would pass the literal string to OpenTofu. Changed it to an unquoted heredoc delimiter and used a YAML literal block (`- |`) so the multiline shell command is preserved. Added the `plan` block there as well so the example matches the post's state-and-plan encryption behavior.
- The AWS KMS key provider example omitted the required `key_spec` argument. Added `key_spec = "AES_256"` so the configuration matches OpenTofu's documented `aws_kms` provider requirements for AES-GCM.
- The Vault example used the deprecated path-like KV syntax for a KV v2-style path. Updated it to `vault kv get -mount=secret -field=tf_encryption terraform`, which matches the current Vault CLI documentation.

## Review Notes
OpenTofu and Terraform were not installed in the local workspace, so examples were reviewed against official documentation rather than executed with `tofu validate`. The remaining examples match the documented `TF_ENCRYPTION` HCL/JSON body format and OpenTofu CLI command syntax.
