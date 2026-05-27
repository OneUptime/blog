# Validation Summary: How to Use HashiCorp Vault Dynamic Secrets for Databases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault database secrets engine
- HashiCorp Vault CLI
- PostgreSQL dynamic database credentials
- Vault leases, renewal, and revocation
- Python
- hvac Python client
- psycopg2
- Kubernetes authentication for Vault

## Sources Consulted
- HashiCorp Vault PostgreSQL database plugin HTTP API: https://developer.hashicorp.com/vault/api-docs/secret/databases/postgresql
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault dynamic credential lease management tutorial: https://developer.hashicorp.com/vault/tutorials/db-credentials/manage-dynamic-leases
- HashiCorp Vault lease concepts documentation: https://developer.hashicorp.com/vault/docs/concepts/lease
- hvac database secrets engine documentation: https://python-hvac.org/en/v2.3.0/usage/secrets_engines/database.html
- hvac lease system backend documentation: https://python-hvac.org/en/main/usage/system_backend/lease.html
- hvac Kubernetes auth method documentation: https://python-hvac.org/en/stable/source/hvac_api_auth_methods.html
- PostgreSQL DROP ROLE documentation: https://www.postgresql.org/docs/current/sql-droprole.html

## Issues Found
- The static-versus-dynamic diagram described dynamic secrets as "Automatic rotation via TTL." Vault leases expire or are revoked when their TTL ends; they are not automatically rotated into new credentials by TTL alone. Changed this to "Lease-based expiration via TTL."
- The architecture diagram included an imprecise PostgreSQL grant statement. Updated it to match the later role example by granting privileges on all tables in the public schema.
- The PostgreSQL `revocation_statements` block dropped the generated role without first revoking the object privileges granted during creation. PostgreSQL requires privileges and ownership dependencies to be removed before dropping a role. Added matching `REVOKE` statements before `DROP ROLE`.
- The standalone `renew_lease.py` and `revoke_creds.py` snippets referenced `hvac` in annotations and exception handling without importing it. Added `import hvac` to both snippets.

## Review Notes
The Python snippets were parsed with Python's AST parser after the fixes. The local environment does not have `vault`, `hvac`, or `psycopg2` installed, so the Vault CLI commands and runtime client behavior were verified against official documentation rather than executed locally.
