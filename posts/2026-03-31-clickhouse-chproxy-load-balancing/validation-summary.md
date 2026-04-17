# Validation Summary: How to Use chproxy for ClickHouse Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- chproxy (ClickHouse HTTP proxy / load balancer)
- ClickHouse
- YAML configuration
- Prometheus metrics
- curl / HTTP

## Sources Consulted
- chproxy official documentation: https://www.chproxy.org/install/
- chproxy configuration reference: https://www.chproxy.org/configuration/default/
- chproxy getting started: https://www.chproxy.org/getting_started/
- chproxy GitHub repository: https://github.com/ContentSquare/chproxy

## Issues Found
1. **CLI flag was incorrect.** The post used `chproxy --config config.yml` (double dash). The chproxy CLI uses single-dash GNU-style flags: `-config`. Changed to `chproxy -config config.yml` to match the documented invocation.
2. **`heartbeat.request` value was a raw SQL query.** The post used `request: "SELECT 1"`, but chproxy's heartbeat `request` field is a URI path (default: `/?query=SELECT%201`), not a SQL statement. Updated to `"/?query=SELECT%201"` to match the actual format chproxy expects.
3. **Cache configuration used an outdated/flat schema.** The post used a flat `dir`/`max_size` layout directly under the cache entry. Current chproxy releases require an explicit `mode: "file_system"` with the `dir` and `max_size` nested under a `file_system:` block. Updated the example to the current schema and capitalized the size suffix (`500Mb`) to match the documented format.

## Review Notes
- The download URL pattern (`https://github.com/ContentSquare/chproxy/releases/latest/download/chproxy_linux_amd64`) is plausible and the repository org/name is correct (ContentSquare/chproxy). Users should still verify the exact asset filename on the releases page since asset naming can change between releases.
- The user-level fields `max_concurrent_queries`, `max_execution_time`, and `requests_per_minute` are valid and supported.
- The `server.http.listen_addr` field path and `clusters[].nodes` array of `host:port` strings are correct.
- For production deployments, consider also documenting `allowed_networks` and TLS (`https`) listener options, both of which chproxy supports — these are not technical errors, just useful additions.
