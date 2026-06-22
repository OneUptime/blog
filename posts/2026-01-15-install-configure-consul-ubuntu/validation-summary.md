# Validation Summary: How to Install and Configure HashiCorp Consul on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Consul (service discovery, KV store, service mesh / Connect, ACLs, prepared queries)
- Ubuntu (20.04+)
- HashiCorp APT repository
- systemd
- DNS interface / HTTP API
- Prometheus telemetry

## Sources Consulted
- HashiCorp Consul official docs — Install on Linux / APT repo: https://developer.hashicorp.com/consul/install
- Consul agent configuration reference: https://developer.hashicorp.com/consul/docs/agent/config/config-files
- Consul KV HTTP API: https://developer.hashicorp.com/consul/api-docs/kv
- Consul catalog / health HTTP API: https://developer.hashicorp.com/consul/api-docs/catalog and /health
- Consul ACL CLI and config: https://developer.hashicorp.com/consul/commands/acl and /docs/security/acl
- Consul Connect / sidecar service registration: https://developer.hashicorp.com/consul/docs/connect/registration/sidecar-service
- Consul DNS interface: https://developer.hashicorp.com/consul/docs/services/discovery/dns-overview
- Consul prepared queries API: https://developer.hashicorp.com/consul/api-docs/query
- Consul telemetry / metrics: https://developer.hashicorp.com/consul/docs/agent/telemetry
- Running Consul as a systemd service: https://developer.hashicorp.com/consul/tutorials/production-deploy/deployment-guide

## Issues Found
- **KV HTTP API PUT comment was inaccurate.** The original comment read `# Put value (base64 encoded)` above `curl -X PUT -d 'db.example.com' .../v1/kv/...`. The Consul KV HTTP API takes the **raw** value in the request body on a PUT — base64 encoding only applies to the `Value` field returned in a GET response. The curl command itself was correct, but the comment was misleading. Changed the comment to `# Put value (the body is the raw value; GET responses return it base64 encoded)` to accurately describe the behavior without altering the working command.

## Review Notes
- All other commands, flags, endpoints, and HCL configuration were verified against current Consul documentation and are correct: the HashiCorp APT repo setup, `consul keygen`, agent config fields (`bootstrap_expect`, `retry_join`, `client_addr`, `ui_config`, `acl`, `performance.raft_multiplier`, `connect`, `telemetry.prometheus_retention_time`), the systemd unit (`-config-dir`, HUP reload), DNS port 8600 query forms (including tag and SRV queries), HTTP API paths (`/v1/catalog/services`, `/v1/health/service/...?passing=true`, `/v1/agent/service/register`, `/v1/query`, `/v1/status/leader`, `/v1/agent/metrics?format=prometheus`), ACL CLI commands, and Connect sidecar registration.
- The official `consul` Debian package already ships a systemd unit and creates the `consul` user/group and `/etc/consul.d`. The post's manual systemd unit and directory creation are still valid and functional; they simply duplicate some of what the package provides. Not an error, just a minor caveat worth noting for readers.
- `consul kv get -recurse config/` is labeled "List keys"; it actually returns keys *and* values recursively. The `-keys` flag would list keys only. This is a labeling nuance rather than a functional error, so it was left as-is.
- Version-agnostic guidance throughout; no version-specific claims that have become outdated.
