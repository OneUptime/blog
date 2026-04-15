# Validation Summary: How to Set Up ClickHouse with Vault for Secret Management

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- ClickHouse (database, S3 storage configuration, users.xml)
- HashiCorp Vault (KV v2 secrets engine, Vault Agent, AppRole auth)
- Consul Template engine (used by Vault Agent for template rendering)
- AWS S3 (as ClickHouse external storage backend)
- AWS IAM (as alternative to static credentials)

## Sources Consulted
- HashiCorp Vault Agent template documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- Vault Agent quick-start tutorial: https://developer.hashicorp.com/vault/tutorials/vault-agent/agent-quick-start
- Vault KV v2 HTTP API docs: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- Vault AppRole auth method: https://developer.hashicorp.com/vault/docs/auth/approle
- ClickHouse external disks / S3 storage documentation: https://clickhouse.com/docs/operations/storing-data
- ClickHouse S3 integration docs: https://clickhouse.com/docs/integrations/s3

## Issues Found
1. **Vault Agent template paths missing `data/` prefix for KV v2.** The `secret` function in Vault Agent templates calls the Vault HTTP API directly. For KV v2, the read API endpoint is `/<mount>/data/<path>`, so templates must include the `data/` segment. The post used `secret "secret/clickhouse/admin"` and `secret "secret/clickhouse/s3"`, which would result in 404 errors at runtime. Fixed to `secret "secret/data/clickhouse/admin"` and `secret "secret/data/clickhouse/s3"`. The `.Data.data.<key>` access pattern was already correct.

## Review Notes
- The template writes to `/etc/clickhouse-server/users.xml`, which would overwrite the entire users configuration file (including the default user). In production, writing to `/etc/clickhouse-server/users.d/admin.xml` would be safer as it uses ClickHouse's config.d merge mechanism without disturbing existing user definitions.
- The S3 endpoint uses `s3.amazonaws.com` without a region, which defaults to `us-east-1`. Production configs should use the region-specific endpoint (e.g., `s3.us-east-1.amazonaws.com`).
- The Vault Agent config omits a `sink` block for the auto-auth token, which is fine since the token is only needed in-memory for template rendering. No external process needs the token file.
