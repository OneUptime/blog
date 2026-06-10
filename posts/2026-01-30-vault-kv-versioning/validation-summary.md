# Validation Summary: How to Implement Vault KV Versioning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (KV v2 secrets engine)
- Vault CLI (`vault kv`, `vault secrets`, `vault write`, `vault read`)
- Vault HTTP API (KV v2 endpoints: data, metadata, delete, undelete, destroy)
- Python `hvac` client library
- Bash / `curl`
- Mermaid diagrams

## Sources Consulted
- HashiCorp Vault KV v2 documentation: https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- Vault CLI `vault kv` command reference: https://developer.hashicorp.com/vault/docs/commands/kv
- Vault `vault secrets enable` command reference: https://developer.hashicorp.com/vault/docs/commands/secrets/enable
- hvac Python client KV v2 reference: https://hvac.readthedocs.io/en/stable/usage/secrets_engines/kv_v2.html
- hvac source: `hvac/api/secrets_engines/kv_v2.py`

## Issues Found
No technical issues found.

Verified specifically:
- `vault secrets enable -version=2 -path=<path> kv` is the correct invocation form.
- Mount-level config endpoint `secret/config` accepts `max_versions`, `cas_required`, and `delete_version_after`.
- Per-secret metadata is set via `vault kv metadata put -max-versions=N -delete-version-after=<duration> <path>` (kebab-case flags are correct).
- `vault kv delete`, `vault kv undelete`, and `vault kv destroy` all accept `-versions="1,2"` syntax; `vault kv metadata delete` removes the secret and all versions.
- API paths `/v1/<mount>/data/<path>`, `/v1/<mount>/delete/<path>`, `/v1/<mount>/undelete/<path>`, `/v1/<mount>/destroy/<path>` and the `version=<n>` query parameter on data reads are correct.
- The CAS request body shape `{"options": {"cas": N}, "data": {...}}` matches the Vault API.
- hvac method names and parameter signatures used in the Python examples are correct:
  - `secrets.kv.v2.create_or_update_secret(path, secret, cas=None, mount_point=...)`
  - `secrets.kv.v2.read_secret_version(path, version=None, mount_point=...)`
  - `secrets.kv.v2.read_secret_metadata(path, mount_point=...)`
  - `secrets.kv.v2.delete_secret_versions(path, versions, mount_point=...)`
  - `secrets.kv.v2.undelete_secret_versions(path, versions, mount_point=...)`
  - `secrets.kv.v2.destroy_secret_versions(path, versions, mount_point=...)`
  - `secrets.kv.v2.update_metadata(path, max_versions=..., cas_required=..., delete_version_after=..., mount_point=...)`
- Response shapes used (`response['data']['data']`, `response['data']['metadata']`, `metadata['current_version']`, `metadata['oldest_version']`, `versions` map keyed by version-number string) match Vault's KV v2 API responses.

## Review Notes
- In newer hvac releases (>= 1.x), `read_secret_version` emits a `DeprecationWarning` when `raise_on_deleted_version` is not explicitly passed; the default behavior is unchanged but a future release will flip the default to `True`. The code as written still works; setting `raise_on_deleted_version=True` (or `False`, depending on intent) would be a forward-compatible improvement.
- `sorted(versions.items())` in `get_version_history` sorts version keys lexicographically because they are returned as strings. For secrets with more than 9 versions this will order `"10"` before `"2"`. Cosmetic only — does not affect correctness — but `key=lambda kv: int(kv[0])` would be more accurate for display.
- The mermaid edge labeled `"max_versions exceeded"` simplifies the actual behavior: when a new write would exceed `max_versions`, the *oldest* version is removed from the underlying storage (one per write), not all prior versions at once. The diagram is acceptable as a conceptual sketch.
- `vault server -dev` automatically mounts a KV v2 engine at `secret/`, so `vault secrets enable -version=2 -path=secret kv` will return "path is already in use" in a dev server. The post does not claim otherwise, but readers running on `-dev` should mount at a different path.
- The Python `from datetime import datetime` import is unused in the example; harmless but could be removed.
