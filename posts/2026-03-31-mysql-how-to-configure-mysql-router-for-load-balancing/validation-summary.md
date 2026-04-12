# Validation Summary: How to Configure MySQL Router for Load Balancing

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MySQL Router
- MySQL InnoDB Cluster
- MySQL Router REST API
- MySQL Connector/Python (`mysql.connector`)
- MySQL Router metadata cache

## Sources Consulted
- MySQL Router 8.0 documentation: routing strategies (`first-available`, `next-available`, `round-robin`, `round-robin-with-fallback`)
- MySQL Router 8.0 configuration reference: `[routing]`, `[metadata_cache]`, `[connection_pool]`, `[http_server]`, `[rest_api]`, `[rest_routing]` sections
- MySQL Router REST API reference (API version `20190715`, introduced in 8.0.17)
- MySQL Router connection pooling documentation (`max_idle_server_connections`, introduced in 8.0.22)
- MySQL Connector/Python `mysql.connector.connect()` API reference

## Issues Found
No technical issues found.

## Review Notes
- The REST API configuration example shows `require_realm = default_auth` in `[rest_routing]` but does not include the corresponding `[http_auth_realm]` and `[http_auth_backend]` sections needed for a complete working configuration. This is acceptable since the post focuses on routing/load balancing, not full REST API setup.
- The `connection_pool` feature (`max_idle_server_connections`) requires MySQL Router 8.0.22 or later. The post does not mention this version requirement.
- The `ttl = 5` (seconds) in the metadata cache is higher than the default (0.5 seconds). This is a valid configuration choice but means topology changes take longer to propagate. The post correctly explains what the value means.
