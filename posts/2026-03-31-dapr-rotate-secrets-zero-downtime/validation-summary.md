# Validation Summary: How to Rotate Secrets Without Downtime Using Dapr

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Dapr (Secrets Management API)
- HashiCorp Vault (KV v2 secret engine)
- Python (httpx async HTTP client)
- PostgreSQL (user password management)
- Kubernetes (kubectl exec, logs)

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr HashiCorp Vault secret store component: https://docs.dapr.io/reference/components-reference/supported-secret-stores/hashicorp-vault/
- HashiCorp Vault KV put command: https://developer.hashicorp.com/vault/docs/commands/kv/put
- HashiCorp Vault "Your First Secret" tutorial: https://developer.hashicorp.com/vault/tutorials/getting-started/getting-started-first-secret
- httpx async client documentation: https://www.python-httpx.org/async/
- PostgreSQL ALTER USER documentation: https://www.postgresql.org/docs/current/sql-alteruser.html

## Issues Found

1. **Deprecated `vault kv put` path syntax (3 occurrences)**
   - **What was wrong:** The post used `vault kv put secret/db-credentials ...` which is a deprecated combined-path syntax. HashiCorp's documentation explicitly discourages this for KV v2 because the API path (`secret/data/db-credentials`) differs from the user-facing path, causing confusion.
   - **What was changed:** Updated all three `vault kv put` commands to use the modern `-mount` flag syntax: `vault kv put -mount=secret db-credentials ...`.
   - **Why:** The `-mount` flag is the recommended modern syntax per HashiCorp's official documentation.

2. **Misleading comment in Step 3 rotation procedure**
   - **What was wrong:** The comment said "Add the new password alongside the old one in the DB" but the `ALTER USER appuser PASSWORD 'new-password'` command *replaces* the existing password immediately. PostgreSQL does not support having two active passwords for the same user.
   - **What was changed:** Updated the comment to "Change the password in the DB" to accurately reflect what the command does.
   - **Why:** The original comment was factually incorrect about the behavior of `ALTER USER ... PASSWORD`.

## Review Notes
- The Dapr Secrets API endpoint format (`/v1.0/secrets/{store}/{name}`) is correct and current.
- The `metadata.version_id` query parameter for retrieving specific Vault KV v2 versions via Dapr is correctly documented and supported.
- The Python `httpx.AsyncClient` usage pattern is correct and follows the library's recommended async context manager approach.
- The PostgreSQL `ALTER USER ... PASSWORD` syntax is valid (the `WITH` keyword is optional).
- The `kubectl exec` and `kubectl logs` commands are syntactically correct.
- Note: Because `ALTER USER` immediately replaces the password, there is an inherent brief window between the DB password change and services picking up the new secret (bounded by the cache TTL) where cached old credentials will fail authentication. The post's approach minimizes but does not completely eliminate this window. A true zero-gap approach would require database-level dual-password support or a proxy layer, which is beyond the scope of this post.
