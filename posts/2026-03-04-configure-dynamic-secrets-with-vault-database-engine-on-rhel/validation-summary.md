# Validation Summary: How to Configure Dynamic Secrets with Vault Database Engine on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- HashiCorp Vault
- Vault database secrets engine
- PostgreSQL
- MySQL
- Python
- hvac
- psycopg2

## Sources Consulted
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault MySQL/MariaDB database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/mysql-maria
- HashiCorp Vault database secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/databases
- HashiCorp Vault lease concepts and CLI documentation: https://developer.hashicorp.com/vault/docs/concepts/lease
- HashiCorp Vault audit enable CLI documentation: https://developer.hashicorp.com/vault/docs/commands/audit/enable
- HashiCorp Vault installation documentation: https://developer.hashicorp.com/vault/downloads/
- Red Hat Enterprise Linux database server documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/configuring_and_using_database_servers
- hvac database secrets engine documentation: https://python-hvac.org/en/stable/usage/secrets_engines/database.html
- hvac lease system backend documentation: https://python-hvac.org/en/v0.10.12/usage/system_backend/lease.html

## Issues Found
- PostgreSQL `pg_hba.conf` rules were appended to the end of the file. Because PostgreSQL uses the first matching authentication rule, these entries might not override existing local host rules on RHEL. Changed the command to insert the rules at the top of `pg_hba.conf`.
- PostgreSQL authentication used `md5`. Current RHEL PostgreSQL guidance documents `scram-sha-256` password hashing and authentication. Updated the setup to set `password_encryption`, create the Vault management role with a SCRAM password, use `scram-sha-256` in `pg_hba.conf`, and configure Vault's PostgreSQL plugin with `password_authentication="scram-sha-256"`.
- The MySQL section configured Vault with a `vault_admin` account but did not create that account in the MySQL server setup. Added a minimal MySQL user creation and grant block so the connection example has a valid management user.

## Review Notes
- The examples are appropriate for local testing. A production Vault deployment should not use dev mode or hard-coded root tokens.
- The PostgreSQL `GRANT ... ON ALL TABLES IN SCHEMA public` statements apply to existing tables. Future tables may require default privileges or a different privilege model.
- Lease listing and prefix revocation are administrative operations and should be tightly controlled with Vault policies.
