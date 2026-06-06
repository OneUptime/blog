# Validation Summary: How to Implement Dynamic Database Credentials with Vault

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- HashiCorp Vault (database secrets engine, audit devices, telemetry, Agent Injector)
- PostgreSQL (CREATE ROLE / pg_user)
- MySQL (CREATE USER syntax)
- MongoDB
- Consul (storage backend)
- Python with `hvac` and `psycopg2` (plus `tenacity`, `circuitbreaker`)
- Node.js with `node-vault` and `pg`
- Go with `github.com/hashicorp/vault/api` and `lib/pq`
- Kubernetes (Vault Agent Injector, Helm chart, kubernetes auth method)
- Prometheus (alerting rules) and syslog/file audit backends

## Sources Consulted
- HashiCorp Vault install docs — https://developer.hashicorp.com/vault/install
- Vault database secrets engine — https://developer.hashicorp.com/vault/docs/secrets/databases
- Vault telemetry / metrics reference — https://developer.hashicorp.com/vault/docs/internals/telemetry/metrics/all
- Vault syslog audit device — https://developer.hashicorp.com/vault/docs/audit/syslog
- Vault Agent Injector annotations — https://developer.hashicorp.com/vault/docs/platform/k8s/injector/annotations
- Vault `/sys/leases` HTTP API — https://developer.hashicorp.com/vault/api-docs/system/leases
- hvac Database secrets engine docs — https://python-hvac.org/en/stable/usage/secrets_engines/database.html
- hvac Lease system backend docs — https://python-hvac.org/en/stable/usage/system_backend/lease.html
- node-vault — https://www.npmjs.com/package/node-vault
- Vault Go API package — https://pkg.go.dev/github.com/hashicorp/vault/api

## Issues Found

1. **Deprecated `apt-key add` install method.** The original install snippet piped the HashiCorp GPG key into `sudo apt-key add -`, which is deprecated on modern Debian/Ubuntu. Replaced with the current HashiCorp-documented approach using `gpg --dearmor` to write a keyring file under `/usr/share/keyrings/` and a `signed-by=` entry in `/etc/apt/sources.list.d/hashicorp.list`.

2. **Invalid Prometheus metric `vault_secret_lease_creation_error_count`.** This metric is not exposed by Vault. Replaced with `vault_expire_lease_expiration_error`, which is a real counter from `vault.expire.lease_expiration.error` documented in Vault's telemetry reference (and used to surface lease-related failures).

3. **Invalid Prometheus metric `vault_database_connection_available`.** This metric does not exist in Vault telemetry. Replaced the alert with one based on `vault_database_Initialize_error`, which is a real counter exposed for database plugin initialization failures (`vault.database.Initialize.error`).

## Review Notes

- The Consul storage backend used in the production config example still works, but HashiCorp now recommends the integrated Raft storage backend (`storage "raft"`) for new deployments. Left as-is since the post explicitly lists it as a valid production storage backend and the syntax is correct.
- The Kubernetes auth `token_reviewer_jwt` option still works but is no longer required as of newer Vault versions; Vault can use its own service account token via TokenRequest API. Left as-is — the shown approach remains valid.
- hvac dict-style access (`response['data']['username']`, `response['lease_id']`, `response['lease_duration']`) is correct: `generate_credentials` returns the parsed Vault JSON response.
- Go API usage (`vault.DefaultConfig()`, `client.Sys().Renew(id, increment)`, `secret.LeaseID`, `secret.LeaseDuration`, `secret.Data["username"].(string)`) all match the current `github.com/hashicorp/vault/api` package.
- Vault Agent Injector annotations (`agent-inject`, `role`, `agent-inject-secret-<name>`, `agent-inject-template-<name>`) all match the documented annotation set.
- Audit device syntax (`vault audit enable file file_path=...`, `vault audit enable syslog tag="vault" facility="AUTH"`) matches current docs.
- PostgreSQL `CREATE ROLE ... WITH LOGIN PASSWORD ... VALID UNTIL` and MySQL `CREATE USER '...'@'%' IDENTIFIED BY` creation statements are syntactically correct and follow the conventions used in Vault's own database plugin documentation.
