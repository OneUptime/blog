# Validation Summary: How to Use Vault for Secret Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (CLI, KV v2 secrets engine, database secrets engine, AppRole, Kubernetes auth, PKI engine references)
- HashiCorp Vault Agent and Vault Agent Injector
- Docker (running Vault in dev mode)
- HCL (Vault policies, agent configuration, auto-unseal)
- Python (`hvac` library)
- Node.js (`node-vault` package)
- Go (`github.com/hashicorp/vault/api`)
- Kubernetes (Deployment manifests, Helm chart `hashicorp/vault`)
- PostgreSQL (dynamic database credentials)
- AWS KMS (auto-unseal)
- Consul / Raft (storage backends and snapshot backups)

## Sources Consulted
- HashiCorp Vault Developer Quickstart: https://developer.hashicorp.com/vault/docs/get-started/developer-qs
- Vault Go API reference (`api/kv_v2.go`): https://github.com/hashicorp/vault/blob/main/api/kv_v2.go
- AppRole Go helper package: https://pkg.go.dev/github.com/hashicorp/vault/api/auth/approle
- hvac (Python) KV v2 docs: https://python-hvac.org/en/stable/usage/secrets_engines/kv_v2.html
- hvac AppRole auth docs: https://python-hvac.org/en/stable/usage/auth_methods/approle.html
- node-vault npm package: https://www.npmjs.com/package/node-vault
- node-vault repository: https://github.com/nodevault/node-vault
- Vault Agent Injector / Helm chart docs: https://developer.hashicorp.com/vault/docs/platform/k8s/injector
- Vault KV v2 secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- Vault auto-unseal with AWS KMS: https://developer.hashicorp.com/vault/docs/configuration/seal/awskms

## Issues Found

1. **Go example — missing `context` import (compile error)**
   - The `main` function called `context.Background()`, but the `context` package was not in the import block. Go would refuse to compile.
   - Fix: added `"context"` to the import list.

2. **Go example — unused `os` import (compile error)**
   - The `os` package was imported but never used. Go treats unused imports as a build error.
   - Fix: removed `"os"` from the import list.

3. **Go example — misleading comment about KV v2 paths**
   - The comment read: `// For KV v2, the path must include 'data' after the mount point`. That's true for the raw `Logical().Read` API, but the post uses `client.KVv2("myapp").Get(...)`, which internally handles the `data/` prefix. The comment contradicted the code.
   - Fix: replaced with `// The KVv2 helper handles the 'data' path prefix automatically`.

## Review Notes
- The Go AppRole login uses `client.Logical().Write("auth/approle/login", data)` followed by `client.SetToken(...)`. This works and is a valid API path, but the idiomatic modern approach is the `api/auth/approle` helper package (`approle.NewAppRoleAuth(...)` + `client.Auth().Login(ctx, ...)`). Not a correctness issue — left as-is to preserve the author's style.
- In `hvac` 2.x, `read_secret_version` emits a `DeprecationWarning` unless `raise_on_deleted_version` is passed explicitly. The post's usage still works but will print warnings on newer hvac. Worth a future polish; not a correctness bug.
- The read-only policy grants `list` on `myapp/data/*`. In KV v2, list operations are served from `myapp/metadata/*` (which the policy already covers), so the `list` capability on `myapp/data/*` is functionally redundant but harmless. Not changed.
- Vault binary download URL pins version `1.15.4`, which existed at time of writing. The accompanying comment "check for latest version" already tells readers to verify, so leaving the pinned URL is appropriate.
- Docker image `hashicorp/vault:latest` is the correct image after the rename from the legacy `vault` image.
- All CLI flags (`-key-shares`, `-key-threshold`, `vault kv put/get/delete/undelete/destroy`, `vault secrets enable -path=... -version=2 kv`, `vault audit enable file file_path=...`, `vault operator raft snapshot save`, `vault operator generate-root -init`) verified against current Vault CLI documentation.
- Vault Agent Injector annotations (`vault.hashicorp.com/agent-inject`, `agent-inject-secret-*`, `agent-inject-template-*`, `role`) are all correct.
