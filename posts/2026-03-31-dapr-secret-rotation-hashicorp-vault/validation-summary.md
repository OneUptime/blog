# Validation Summary: How to Implement Secret Rotation with Dapr and HashiCorp Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store component)
- HashiCorp Vault (KV v2 secrets engine, database secrets engine)
- Python (Dapr SDK)
- MySQL (database secrets engine target)
- Bash (rotation scripting)

## Sources Consulted
- Dapr HashiCorp Vault secret store component docs: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- Dapr components-contrib Vault source code: https://github.com/dapr/components-contrib/blob/main/secretstores/hashicorp/vault/vault.go
- Dapr Python SDK source code and documentation (v1.16.2): `dapr.clients.DaprClient.get_secret` method signature and `GetSecretResponse` return type
- HashiCorp Vault KV v2 secrets engine documentation
- HashiCorp Vault database secrets engine documentation (MySQL plugin)
- HashiCorp Vault CLI reference (`vault kv put`, `vault write`, `vault secrets enable`)

## Issues Found

1. **Removed non-existent `vaultVersionedKV` metadata field**: The Dapr Vault component YAML included a `vaultVersionedKV` metadata field set to `"true"`. This field does not exist in the Dapr HashiCorp Vault secret store component specification. The Dapr Vault component handles KV v2 versioning internally without a toggle. Removed the two lines from the component YAML.

2. **Fixed undefined `CURRENT_PASSWORD` variable in rotation script**: The bash rotation script referenced `${CURRENT_PASSWORD}` to authenticate to MySQL but never defined or fetched it. Added a line to fetch the current password from Vault using `vault kv get -field=password secret/database/app-credentials` before using it.

3. **Exported `VAULT_ADDR` environment variable**: The script set `VAULT_ADDR` but did not export it. The `vault` CLI requires `VAULT_ADDR` to be an exported environment variable. Changed to `export VAULT_ADDR=...` and moved it before the commands that depend on Vault access.

## Review Notes
- The second Dapr YAML snippet (for dynamic secrets) uses `enginePath: "database"` and `vaultKVPrefix: "creds"` to read from Vault's database secrets engine. While this path construction may work in practice (constructing the path `database/creds/<key>`), the Dapr Vault component is primarily designed and documented for KV secrets engines. This approach is a reasonable technique but readers should be aware it relies on path construction rather than official Dapr support for dynamic database secrets.
- The `SecretWatcher` polling pattern is a pragmatic approach since Dapr does not currently provide a subscription/notification mechanism for secret changes. The implementation is correct but readers should be aware that polling intervals must balance freshness against API load.
- The Vault CLI commands for the database secrets engine are all correct, including the MySQL connection URL DSN format with `tcp()` wrapper and the `{{name}}`/`{{password}}` template variables in creation statements.
