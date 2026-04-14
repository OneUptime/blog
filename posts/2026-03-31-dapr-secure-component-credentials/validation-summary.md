# Validation Summary: How to Secure Dapr Component Credentials

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr secret stores (secretKeyRef mechanism)
- Kubernetes Secrets
- HashiCorp Vault (`secretstores.hashicorp.vault`)
- AWS Secrets Manager (`secretstores.aws.secretmanager`)
- Dapr component scoping
- Dapr Secrets API

## Sources Consulted
- Dapr Component Secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Component Scopes documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Supported Secret Stores reference: https://docs.dapr.io/reference/components-reference/supported-secret-stores/

## Issues Found
1. **Incorrect `scopes` field placement in component YAML** (Scoping Secret Store Access section): The `scopes` field was indented under `spec` (as a child of `spec`), but according to official Dapr documentation, `scopes` is a top-level field in the component resource — a sibling of `spec`, `metadata`, and `apiVersion`. Fixed by removing the 2-space indent so `scopes` sits at the root level of the YAML document.

## Review Notes
- The `auth.secretStore` placement as a sibling of `spec` is correct per official docs.
- The Vault secret store component type `secretstores.hashicorp.vault` and its metadata fields (`vaultAddr`, `vaultToken`, `vaultKVPrefix`) are all correct.
- The AWS Secrets Manager type `secretstores.aws.secretmanager` and metadata fields (`region`, `accessKey`, `secretKey`) are correct. The empty string values shown are valid when using IAM roles or instance profiles on EKS.
- The Vault secret store example uses a plaintext `vaultToken: "root"` — this is technically how Vault token auth is configured in Dapr (the secret store itself cannot reference another secret store for its own credentials), but readers should be cautioned that a production setup would use a more secure auth method (e.g., Vault Kubernetes auth).
- The secrets API endpoint `http://localhost:3500/v1.0/secrets/vault-secret-store/redis/password` follows the correct format. The path `redis/password` is valid as a Vault KV path name.
- The `kubectl` command for creating Kubernetes secrets and the log inspection commands are correct.
