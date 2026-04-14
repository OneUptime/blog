# Validation Summary: How to Implement Tenant-Specific Secret Stores with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (secret store components, component scoping)
- HashiCorp Vault Enterprise (namespaces, audit logging)
- AWS Secrets Manager (IAM path-based isolation)
- Kubernetes (namespace-scoped components, secret references)
- Dapr JavaScript SDK (`@dapr/dapr`)

## Sources Consulted
- Dapr official documentation — HashiCorp Vault secret store component spec (https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/)
- Dapr official documentation — AWS Secrets Manager component spec (https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-secret-manager/)
- Dapr GitHub source code — `secretstores/hashicorp/vault/vault.go` metadata struct and field mappings
- Dapr GitHub source code — `secretstores/aws/secretmanager` metadata struct confirming field name `secretKey`
- Dapr official documentation — component scoping (https://docs.dapr.io/operations/components/component-scopes/)
- Dapr official documentation — referencing secrets in component definitions (https://docs.dapr.io/operations/components/component-secrets/)
- Dapr JavaScript SDK source — `IClientSecret` interface confirming `secret.get()` API
- HashiCorp Vault CLI documentation — `vault namespace` subcommands (https://developer.hashicorp.com/vault/docs/commands/namespace)
- HashiCorp Vault CLI documentation — `vault audit enable` (https://developer.hashicorp.com/vault/docs/commands/audit/enable)
- AWS IAM documentation — ARN format for Secrets Manager resources

## Issues Found

1. **AWS Secrets Manager metadata field name `secretAccessKey` incorrect (line 86)**
   - **What was wrong:** The metadata field was named `secretAccessKey`. The correct Dapr metadata field name for the AWS Secrets Manager component is `secretKey`, as confirmed by the Go source struct tag `mapstructure:"secretKey"`.
   - **What was changed:** Renamed `secretAccessKey` to `secretKey`.
   - **Why:** Using the wrong field name would cause the component to fail to authenticate with AWS, as the secret access key value would not be read by the component.

2. **AWS account ID in IAM policy ARN only 9 digits (line 98)**
   - **What was wrong:** The ARN used `123456789` as the account ID placeholder, but AWS account IDs are always exactly 12 digits.
   - **What was changed:** Changed `123456789` to `123456789012`.
   - **Why:** A 9-digit account ID is invalid in AWS and would never match a real resource ARN.

3. **Invalid Vault CLI command `vault namespace exec` (line 142-143)**
   - **What was wrong:** The command `vault namespace exec -namespace tenant-a vault audit enable ...` used a non-existent `exec` subcommand. The `vault namespace` command only supports `create`, `delete`, `list`, `lookup`, `lock`, and `unlock` subcommands.
   - **What was changed:** Replaced with `vault audit enable -namespace=tenant-a file file_path=/vault/logs/tenant-a-audit.log`, which uses the `-namespace` flag directly on the `vault audit enable` command.
   - **Why:** The original command would produce a CLI error. The `-namespace` flag (or `VAULT_NAMESPACE` environment variable) is the correct way to target a Vault namespace.

## Review Notes
- The `vaultNamespace` metadata field used in the Vault component YAML (Option 1) was not found in the current Dapr HashiCorp Vault component source code or official documentation. The supported metadata fields are: `vaultAddr`, `vaultToken`, `vaultTokenMountPath`, `vaultKVPrefix`, `vaultKVUsePrefix`, `enginePath`, `vaultValueType`, and TLS-related fields. If this field is not supported, the component would silently ignore it and not target the intended Vault namespace. Users implementing this pattern should verify the field is supported in their Dapr version, or consider setting the Vault namespace via Vault client configuration outside of Dapr.
- The JavaScript SDK code correctly uses `daprClient.secret.get()` and `secret[secretName]` for accessing the returned value, which works correctly for name/value secret stores like Vault and AWS Secrets Manager. For stores with multiple keys per secret (e.g., Kubernetes secrets), the access pattern would differ.
- The `scopes` field is correctly placed at the top level of the Component YAML (same level as `spec`), not nested under `spec`.
