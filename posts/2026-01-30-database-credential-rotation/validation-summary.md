# Validation Summary: How to Build Database Credential Rotation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HashiCorp Vault database secrets engine
- HashiCorp Vault PostgreSQL database plugin
- HashiCorp Vault Kubernetes auth method
- Vault ACL policies and lease renewal
- PostgreSQL roles and privileges
- Python
- hvac
- psycopg2
- SQLAlchemy connection pooling
- Prometheus alerting rules

## Sources Consulted
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault database secrets engine API documentation: https://developer.hashicorp.com/vault/api-docs/secret/databases
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth method API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault telemetry metrics documentation: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- HashiCorp Vault secrets telemetry documentation: https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/secrets
- HashiCorp Vault /sys/metrics API documentation: https://developer.hashicorp.com/vault/api-docs/system/metrics
- hvac database secrets engine documentation: https://python-hvac.org/en/stable/usage/secrets_engines/index.html
- hvac lease renewal documentation: https://python-hvac.org/en/stable/usage/system_backend/lease.html
- hvac Kubernetes auth documentation: https://python-hvac.org/en/stable/usage/auth_methods/kubernetes.html
- SQLAlchemy connection pooling documentation: https://docs.sqlalchemy.org/en/latest/core/pooling.html

## Issues Found
- The first Python example imported `os` but did not use it. Removed the unused import.
- The renewal thread could read `_lease_duration` before credentials had been fetched if `start_renewal_thread()` was called first. Initialized `_lease_duration` and made `start_renewal_thread()` fetch credentials before starting the loop when no lease exists.
- The lease renewal example ignored the renewed lease duration returned by Vault. Updated it to store the new `lease_duration` from `client.sys.renew_lease()`.
- The SQLAlchemy example passed a one-time database URL to `create_engine()`, so invalidated connections would not necessarily fetch fresh Vault credentials. Replaced it with a `creator` function that calls Vault for credentials when SQLAlchemy opens a new DBAPI connection.
- The SQLAlchemy checkout hook raised a generic `Exception`. SQLAlchemy documents `sqlalchemy.exc.DisconnectionError` as the signal that causes the pool to discard the connection and retry, so the example now raises that exception.
- The SQLAlchemy example used `time` without importing it in that code block. Added the needed imports, including `psycopg2` and `sqlalchemy.exc`.
- The Prometheus credential failure alert used `vault_secret_kv_count` with labels that do not represent database credential generation failures. Replaced it with `increase(vault_database_CreateUser_error[5m])`, matching Vault's database user creation error telemetry.

## Review Notes
- The Vault database secrets engine setup, PostgreSQL role creation statements, Kubernetes auth configuration, Vault policy path for `database/creds/myapp-readonly`, and lease renewal policy path are consistent with the referenced documentation.
- The Kubernetes auth configuration example assumes Vault can reach `https://kubernetes.default.svc` and read the referenced service account CA certificate, which is typical when Vault is running in the cluster. External Vault deployments need cluster-specific Kubernetes host, CA, and token reviewer configuration.
