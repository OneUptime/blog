# Validation Summary: How to Configure a Credentials Helper in OpenTofu

## Status
validated

## Post Type
Guide / tutorial

## Technologies Covered
- OpenTofu CLI configuration
- OpenTofu credentials helpers
- OpenTofu OCI registry authentication
- HashiCorp Vault CLI
- AWS Secrets Manager
- Bash
- HCL

## Sources Consulted
- OpenTofu CLI Configuration File: https://opentofu.org/docs/v1.11/cli/config/config-file/
- OpenTofu Credentials Helpers: https://opentofu.org/docs/internals/credentials-helpers/
- OpenTofu OCI Registry Credentials: https://opentofu.org/docs/cli/oci_registries/credentials/
- AWS Secrets Manager `get-secret-value` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html
- AWS Secrets Manager CLI retrieval guide: https://docs.aws.amazon.com/en_us/secretsmanager/latest/userguide/retrieving-secrets_cli.html

## Issues Found
- The post claimed `credentials_helper` covered "OCI artifact stores". OpenTofu documents `credentials` and `credentials_helper` for OpenTofu-specific protocols, while OCI registries use `oci_credentials`, Docker-style configuration files, or a configured Docker credentials helper. I corrected the description, introduction, and summary to reflect that split.
- The helper naming and discovery details were inaccurate. The post said the helper could be named `tofu-credentials-<name>` and only needed to be on the `PATH`; OpenTofu documents the `terraform-credentials-<name>` naming convention and searches default plugin locations. I corrected the helper example and install path.
- The sample helper protocol was wrong. OpenTofu passes helper arguments followed by a verb and hostname, not a JSON payload on stdin for `get`; JSON on stdin is used for `store`. I updated the script to read `ACTION` and `HOST` from positional arguments, return JSON for `get`, consume stdin for `store`, and handle unsupported verbs correctly.
- The sample `echo` command produced invalid JSON because of shell quoting. I replaced it with `jq -n --arg token "$TOKEN" '{token: $token}'`.
- The AWS CodeArtifact example was not a valid example for OpenTofu `credentials` blocks or OCI registry authentication in this context. I replaced it with an AWS Secrets Manager example that matches the article's secret-source theme.

## Review Notes
- `.terraformrc` is still supported by OpenTofu for backward compatibility, but `.tofurc` is the primary filename on Unix-like systems.
- The example Vault helper is intentionally read-only, so `tofu login` would not be able to persist credentials through it; that is acceptable for automation-oriented retrieval helpers.
- The AWS Secrets Manager snippet assumes the secret is stored as a plaintext `SecretString` containing only the token.
