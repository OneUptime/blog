# Validation Summary: How to Use Dynamic Secrets with Dapr and HashiCorp Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (secret store component)
- HashiCorp Vault (database secrets engine, AWS secrets engine, lease management)
- PostgreSQL (dynamic credential target)
- Python (Dapr SDK, psycopg2, boto3)
- AWS IAM (dynamic credential generation)
- curl (Vault HTTP API)

## Sources Consulted
- Dapr HashiCorp Vault secret store component specification — https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- HashiCorp Vault Database Secrets Engine documentation — https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault AWS Secrets Engine documentation — https://developer.hashicorp.com/vault/docs/secrets/aws
- HashiCorp Vault HTTP API: sys/leases/renew — https://developer.hashicorp.com/vault/api-docs/system/leases
- Dapr Python SDK get_secret API — https://docs.dapr.io/developing-applications/sdks/python/

## Issues Found

1. **Invalid Dapr component metadata field `vaultVersionedKV`**: The `vaultVersionedKV` field is not a recognized metadata field for the `secretstores.hashicorp.vault` Dapr component. Removed the field from the YAML configuration.

2. **Hardcoded role name in Python code instead of using constructor parameter**: The `_create_connection` method used `key=f"app-role"` (a hardcoded string with an unnecessary f-string prefix) instead of `key=self.role_name`, making the `role_name` constructor parameter useless. Changed to `key=self.role_name` so the class works as designed.

3. **Malformed curl command with two `-d` flags in lease renewal**: The curl command used two separate `-d` flags (`-d '{"increment": "1h"}'` and `-d '{"lease_id": "..."}'`), which causes curl to concatenate the payloads with `&` rather than producing valid JSON. Combined into a single `-d` flag with one JSON object containing both `lease_id` and `increment`.

4. **`increment` field should be integer seconds for the Vault HTTP API**: The Vault API `/sys/leases/renew` expects `increment` as an integer (seconds), not a duration string. Changed `"1h"` to `3600`.

## Review Notes
- The Dapr component configuration uses `enginePath` and `vaultKVPrefix` to route requests to Vault's `database/creds/<role>` path. This relies on Dapr correctly detecting that the database engine is not a KV v2 engine and therefore not inserting `/data/` into the path. This should work correctly in practice since Dapr queries Vault's `sys/mounts` to determine engine type.
- The `_lease_id` attribute initialized in `DynamicDBConnection.__init__` is never used. This is not technically wrong but is dead code.
- The AWS example uses `credential_type=iam_user` which creates actual IAM users. For production use, `assumed_role` or `federation_token` credential types are generally preferred as they don't create persistent IAM entities.
- The Vault setup commands use example credentials (`AKIAIOSFODNN7EXAMPLE`) which is appropriate for a tutorial but should be clearly noted as placeholder values — the post does not explicitly call this out.
