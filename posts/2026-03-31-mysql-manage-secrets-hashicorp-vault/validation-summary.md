# Validation Summary: How to Manage MySQL Secrets with HashiCorp Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- HashiCorp Vault (database secrets engine)
- Vault CLI
- Python hvac client library
- PyMySQL

## Sources Consulted
- HashiCorp Vault MySQL/MariaDB Database Plugin docs: https://developer.hashicorp.com/vault/docs/secrets/databases/mysql-maria
- HashiCorp Vault Database Secrets Engine docs: https://developer.hashicorp.com/vault/docs/secrets/databases
- hvac Python client documentation: https://hvac.readthedocs.io/en/stable/usage/secrets_engines/database.html

## Issues Found
1. **Incorrect `connection_url` format in Vault database configuration**: The original post used literal credentials embedded directly in the `connection_url` (`"vault_admin:VaultAdminPass!@tcp(...)"`). The official Vault documentation specifies using `{{username}}:{{password}}` template placeholders in the URL with separate `username` and `password` fields. This is required for Vault's root credential rotation feature to work and is the documented best practice. Fixed by updating the `vault write database/config/myapp-mysql` command to use template variables and added the separate `username` and `password` parameters.

## Review Notes
- The `FLUSH PRIVILEGES` in the MySQL user setup section is unnecessary when using `CREATE USER` and `GRANT` statements in MySQL 8.0+ (these statements automatically update the grant tables), but including it causes no harm and is a common convention in tutorials.
- The blog states "Vault automatically runs `DROP USER` when the lease expires." This is a simplification -- Vault's actual default revocation behavior for MySQL may involve renaming the user before dropping, but the end result is the same (user removal). Acceptable for a tutorial.
- All Vault CLI commands (`vault secrets enable`, `vault read`, `vault lease renew`, `vault lease revoke`) are correct.
- The role creation statements using `{{name}}` and `{{password}}` template variables are correct per the MySQL plugin documentation.
- The Python hvac client code is correct: `generate_credentials(name='app-role')` matches the library's API, and the response is correctly accessed via `creds['data']['username']` and `creds['data']['password']`.
