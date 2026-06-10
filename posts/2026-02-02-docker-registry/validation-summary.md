# Validation Summary: How to Configure Docker Registry

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Docker Registry (distribution/distribution v2)
- Docker / Docker Compose
- Amazon S3, Google Cloud Storage, Azure Blob Storage
- Redis (for blob descriptor caching)
- TLS / OpenSSL
- htpasswd (apache2-utils) basic authentication
- Token-based authentication
- Nginx (reverse proxy)
- Prometheus (metrics)
- HAProxy (load balancing health checks)

## Sources Consulted
- Official Docker Distribution configuration reference: https://distribution.github.io/distribution/about/configuration/
- Docker Distribution storage drivers documentation
- Docker Distribution notifications/webhooks documentation
- Distribution garbage-collect command reference

## Issues Found

1. **Redis configuration field names were outdated.** The original used the legacy field names from the previous Redis client library:
   - `addr: redis:6379` was changed to `addrs: [redis:6379]` (now accepts an array of addresses).
   - The nested `pool.maxidle`, `pool.maxactive`, `pool.idletimeout` block was changed to the current flat fields `maxidleconns`, `poolsize`, and `connmaxidletime` respectively.
   - Applied the same `addr` -> `addrs` fix to the HA shared-storage Redis example.

2. **Incorrect comment on `auth.token.autoredirect`.** The original comment described it as "Auto-refresh public keys from JWKS endpoint", which is not what this field does. The field actually sets the realm to the request's Host header when true. Updated the comment to accurately describe the behavior.

## Review Notes
- The `notifications.endpoints.timeout: 1s` value is functional but tight; the docs describe it as the HTTP timeout for webhook calls and a higher value (5s) may be more reliable in practice. Not changed since it is technically valid.
- The post uses `version: 0.1` for the config schema, which is the correct (and only) currently supported value.
- S3 `chunksize: 5242880` (5 MiB) is exactly the minimum allowed by S3 multipart uploads; valid but minimum-edge.
- The `garbage-collect` example correctly stops the registry first; current versions also support `--delete-untagged` for cleaning untagged manifests, but the post's example is still correct as-is.
- Prometheus metric names listed (`registry_storage_action_seconds`, `registry_http_request_duration_seconds`, etc.) match the metrics exported by the registry's debug endpoint.
- `htpasswd -B` (bcrypt) is required by the registry; the post correctly emphasizes this.
- The `insecure-registries` daemon.json snippet and the `/etc/docker/certs.d/<host>:<port>/ca.crt` trust path are both correct per Docker Engine documentation.
