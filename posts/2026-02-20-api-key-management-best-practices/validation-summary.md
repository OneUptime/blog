# Validation Summary: API Key Management Best Practices for Secure Services

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python standard library: secrets, hashlib, dataclasses, time
- PostgreSQL SQL: tables, JSONB, timestamps, partial indexes
- psycopg2
- FastAPI
- Prometheus Python client
- AWS Secrets Manager CLI
- HashiCorp Vault CLI
- Mermaid diagrams

## Sources Consulted
- Python secrets documentation: https://docs.python.org/3/library/secrets.html
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- FastAPI HTTPException documentation: https://fastapi.tiangolo.com/reference/exceptions/
- Prometheus Python client Histogram documentation: https://prometheus.github.io/client_python/instrumenting/histogram/
- Prometheus Python client Labels documentation: https://prometheus.github.io/client_python/instrumenting/labels/
- AWS Secrets Manager CLI documentation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_cli.html
- HashiCorp Vault kv get documentation: https://developer.hashicorp.com/vault/docs/commands/kv/get
- OWASP Secrets Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html

## Issues Found
- The `KeyRotationManager` example called `schedule_deactivation` and `deactivate_expired_keys`, but the earlier `APIKeyStore` example did not define those methods or persist a scheduled deactivation time. Added a `scheduled_deactivation_at` column, an index for scheduled cleanup, and the two missing methods so the rotation example works as described.
- The `api_keys` table defined uniqueness for `key_hash` twice: once inline and once as a named constraint. Removed the duplicate inline `UNIQUE` and kept the named `unique_key_hash` constraint.

## Review Notes
- The Prometheus example is syntactically valid, but production systems with many API keys should watch label cardinality carefully when using `key_id` and `endpoint` labels.
- The examples are illustrative and omit surrounding authentication middleware, connection lifecycle management, and request dependency wiring that a production FastAPI service would need.
