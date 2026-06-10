# Validation Summary: How to Create Vault Database Credentials

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- HashiCorp Vault (database secrets engine, static roles, dynamic roles, leases, policies)
- PostgreSQL (role management, GRANT/REVOKE, pg_terminate_backend)
- hvac (Python Vault client)
- HashiCorp Vault Go SDK (github.com/hashicorp/vault/api)
- Kubernetes (Vault Agent Injector annotations, Secrets Store CSI Driver / vault-csi-provider)
- HCL (Vault policy language)
- MySQL / MariaDB / MongoDB / MSSQL / Oracle / Cassandra / Elasticsearch / Redis / Snowflake (plugin name table)

## Sources Consulted
- Vault `vault read` command docs — https://developer.hashicorp.com/vault/docs/commands/read
- Vault database secrets engine docs — https://developer.hashicorp.com/vault/docs/secrets/databases
- Vault database engine HTTP API — https://developer.hashicorp.com/vault/api-docs/secret/databases
- Vault system leases API — https://developer.hashicorp.com/vault/api-docs/system/leases
- Vault issue #11507 (per-call TTL on `vault read`) — https://github.com/hashicorp/vault/issues/11507
- HashiCorp Vault Go API package — https://pkg.go.dev/github.com/hashicorp/vault/api
- hvac database engine docs — https://python-hvac.org/en/stable/usage/secrets_engines/database.html
- hvac lease (sys backend) docs — https://python-hvac.org/en/stable/usage/system_backend/lease.html

## Issues Found

1. **Invalid CLI flag `vault read -ttl=30m database/creds/...`** — The post demonstrated overriding the role TTL at request time using a `-ttl` flag. This flag does not exist on `vault read` (an open feature request, #11507, confirms it), and the `database/creds/:name` endpoint does not accept a per-call TTL parameter either — it uses the role's `default_ttl` / `max_ttl`. Fix: removed the "Generate Credentials with Custom TTL" subsection and added a one-line note in the renewal section directing readers to create a separate role when they need a different TTL.

2. **Double-unlock panic in the Go example's `RenewCredentials`** — The function called `c.mu.Lock()` and `defer c.mu.Unlock()`, then explicitly called `c.mu.Unlock()` again before tail-calling `FetchCredentials` (which itself locks). The deferred unlock would then fire on an already-unlocked mutex, producing a `sync: unlock of unlocked mutex` panic — and removing the defer alone would also deadlock the inner `FetchCredentials` call. Fix: dropped the `defer`, kept the explicit unlocks before each tail call into `FetchCredentials`, and unlocked before the trailing `log.Printf` (snapshotting `leaseID`/`duration` first so the log line stays correct without holding the lock).

## Review Notes
- The Vault policies grant `update` on `sys/leases/renew` and `sys/leases/revoke` (body-form invocation). Both endpoints also support a path-parameter form (`sys/leases/renew/<lease_id>` / `sys/leases/revoke/<lease_id>`). The post's form works with the hvac and Go SDK calls used in the examples, but operators using clients that hit the path-parameter form would also need policy entries on `sys/leases/renew/+` / `sys/leases/revoke/+`. Not changed because the examples in this post use the body-form path the policies cover.
- `GetDB` in the Go example reads `c.leaseID` outside the mutex before deciding between renew and fetch. This is a benign race in the single-goroutine example but would need a read-lock if used concurrently. Left as-is since the example is single-threaded.
- The Snowflake row in the supported-databases table says "N/A (uses separate fields)" for connection URL. The Snowflake plugin does in fact accept a `connection_url` (DSN form), though it also accepts separate account/username/password fields. Not changed — the table entry is a simplification rather than a factual error, and the post never instructs the reader to use the Snowflake plugin specifically.
- Vault's actual `database/static-creds/...` output prints `rotation_period` as an integer of seconds (e.g. `86400`) rather than `24h`; treat the sample output as illustrative.
- All nine database plugin names, all eight `database/...` paths, and all three Go SDK calls (`Logical().ReadWithContext`, `Sys().RenewWithContext`, `Sys().RevokeWithContext`) verified against current official documentation. The hvac methods (`secrets.database.generate_credentials`, `sys.renew_lease`, `sys.revoke_lease`) and response field names also verified.
