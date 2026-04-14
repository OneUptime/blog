# Validation Summary: How to Use Multiple Secret Stores in a Single Dapr Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (secret stores, configuration, HTTP API)
- AWS Secrets Manager
- Azure Key Vault
- Dapr Local File Secret Store
- Python (requests library)
- Kubernetes (secret management context)
- Apache Kafka (pub/sub component example)

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Local File Secret Store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/
- Dapr AWS Secrets Manager component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/aws-secret-manager/
- Dapr Azure Key Vault component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/azure-keyvault/
- Dapr Component Secrets (auth.secretStore): https://docs.dapr.io/operations/components/component-secrets/
- Dapr Secret Scopes configuration: https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr CLI run command: https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

1. **Incorrect response key in `get_stripe_api_key`**: The code used `"value"` as the key to extract the secret from the Dapr API response. Dapr's secrets API returns single-value secrets (like those from Azure Key Vault) with the secret name as the response key, i.e., `{"stripe-api-key": "<value>"}`. Changed `"value"` to `"stripe-api-key"`.

2. **Incorrect response key in `get_redis_password` for local store**: With `nestedSeparator: "."`, the local file secret store flattens nested JSON into dot-path keys. The secret `redis.password` returns `{"redis.password": "redis-dev-pass"}`, so the extraction key should be `"redis.password"`, not `"password"`. Refactored the method to use an if/else for clarity and correct key names per store.

3. **Inaccurate return type hint on `get_secret`**: The function was annotated `-> str` but returns a `dict` when no `key` parameter is provided (used by `get_all_database_config`). Removed the return type annotation to avoid misleading type information.

## Review Notes
- The `--components-path` flag in the `dapr run` command is deprecated in favor of `--resources-path` (since Dapr CLI v1.11). It still works as an alias, but newer tutorials should prefer `--resources-path`. Not changed since it remains functional.
- The `auth.secretStore` field in the pub/sub component YAML is correctly placed at the top level (sibling of `spec`), matching the official Dapr component schema.
- All Dapr component type names are correct: `secretstores.aws.secretmanager`, `secretstores.azure.keyvault`, `secretstores.local.file`.
- The secret scopes configuration YAML matches the official Dapr Configuration resource schema.
- The `secretKeyRef` usage in secret store components (for bootstrapping credentials from Kubernetes secrets) is a valid Dapr pattern.
