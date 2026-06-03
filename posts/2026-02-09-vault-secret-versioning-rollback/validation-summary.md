# Validation Summary: How to implement Vault secret versioning and rollback for Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- HashiCorp Vault KV v2 secrets engine
- Vault CLI
- Vault HTTP API paths and ACL policies
- Kubernetes CronJob
- Go with `github.com/hashicorp/vault/api`
- `jq` shell scripting

## Sources Consulted
- HashiCorp Vault KV v2 documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault `kv` CLI overview: https://developer.hashicorp.com/vault/docs/commands/kv
- HashiCorp Vault `kv put` command: https://developer.hashicorp.com/vault/docs/commands/kv/put
- HashiCorp Vault `kv get` command: https://developer.hashicorp.com/vault/docs/commands/kv/get
- HashiCorp Vault `kv metadata` command: https://developer.hashicorp.com/vault/docs/commands/kv/metadata
- HashiCorp Vault `kv patch` command: https://developer.hashicorp.com/vault/docs/commands/kv/patch
- HashiCorp Vault `kv rollback` command: https://developer.hashicorp.com/vault/docs/commands/kv/rollback
- HashiCorp Vault `kv destroy` command: https://developer.hashicorp.com/vault/docs/commands/kv/destroy
- HashiCorp Vault soft delete guide: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2/cookbook/delete-data
- Go package documentation for `github.com/hashicorp/vault/api`: https://pkg.go.dev/github.com/hashicorp/vault/api

## Issues Found
- The Go CAS example used incorrect KV v2 API paths by appending `/metadata` and `/data` after the secret path. Updated it to use `mount + "/metadata/" + secretPath` and `mount + "/data/" + secretPath`, which matches the KV v2 API path layout.
- The Go CAS example mutated the secret data map by adding an `options` key, which would write `options` as secret data if reused. Removed that mutation and kept CAS only in the request payload's top-level `options` object.
- The rollback examples manually piped JSON into `vault kv put`, but Vault has a documented `vault kv rollback` command that restores a prior version as a new current version. Replaced the manual full rollback command and script with `vault kv rollback`.
- The version-retention comments implied all older versions are simply auto-deleted. Clarified that `max_versions` permanently deletes the oldest versions when the limit is exceeded, while `delete-version-after` automatically soft-deletes newly written versions after the configured duration.
- The policy section claimed a policy could allow reading only the current version. KV v2 reads current and historical versions through the same `secret/data/...` path with `version` as a query parameter, so Vault ACL paths cannot distinguish those reads. Updated the section to describe version-management permissions instead.
- The version-aware Go example used `ReadWithData` with `map[string]interface{}` parameters, but the Go client expects `map[string][]string`. Updated the example to pass the version query parameter with the correct type and added `strconv`.
- The version-aware Go example used incorrect KV v2 API paths. Added mount-aware helper methods that construct `mount/data/path` and `mount/metadata/path`.
- The cleanup CronJob collected old versions as newline-separated values, but `vault kv destroy -versions` expects comma-separated version numbers. Updated the pipeline to join selected versions with commas.

## Review Notes
Vault CLI and Go compile checks could not be run locally because the `vault` and `gofmt` binaries are not installed in this environment. Command and API validation was performed against current official HashiCorp documentation.
