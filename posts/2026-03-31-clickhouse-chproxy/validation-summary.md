# Validation Summary: How to Use chproxy as a ClickHouse Proxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- chproxy (ClickHouse HTTP proxy / load balancer)
- ClickHouse
- Docker
- Prometheus (metrics)
- YAML (configuration)

## Sources Consulted
- chproxy GitHub repo: https://github.com/ContentSquare/chproxy
- chproxy install docs: https://www.chproxy.org/install/
- chproxy default config docs: https://www.chproxy.org/configuration/default/
- chproxy main entry point: https://github.com/ContentSquare/chproxy/blob/master/main.go
- chproxy metrics source: https://github.com/ContentSquare/chproxy/blob/master/metrics.go
- chproxy full config example: https://github.com/ContentSquare/chproxy/blob/master/config/testdata/full.yml
- chproxy /ping issue thread: https://github.com/ContentSquare/chproxy/issues/127

## Issues Found

1. **Wrong Docker image name and run command.** The post used `contentsquare/chproxy /config.yml`. The official Docker image is `contentsquareplatform/chproxy`, and the binary expects a `-config` flag rather than a positional argument. Updated to `contentsquareplatform/chproxy -config /config.yml`.

2. **Invalid cluster heartbeat fields.** The post used flat fields `heartbeat_interval`, `death_count`, and `death_duration`. chproxy's actual schema uses a nested `heartbeat:` block with `interval`, `timeout`, `request`, and `response` keys. There are no `death_count` or `death_duration` fields. The basic-config example also lacked the required cluster-side `users:` block (chproxy requires per-cluster users that incoming `to_user` maps onto). Replaced with a correct nested heartbeat block and added the cluster-level `users` list.

3. **Incorrect Prometheus metric names.** The post listed `chproxy_requests_total`, `chproxy_cache_hits_total`, and `chproxy_cluster_user_queries_duration_seconds`. None of these exist in chproxy's metrics. The actual metric names (without prefix) include `request_sum_total`, `request_success_total`, `cache_hits_total`, `cache_miss_total`, `concurrent_queries`, and `proxied_response_duration_seconds`. The `chproxy_` prefix only appears if `server.metrics.namespace` is configured. Fixed metric names and added a note about the configurable namespace; also removed the misleading `| grep chproxy` example since metrics are unprefixed by default.

4. **Wrong /ping response description.** The post said `/ping` returns `"pong"`. In reality, chproxy's `/ping` proxies to the upstream ClickHouse `/ping`, which returns `"Ok."` (with newline). Updated comment to reflect this.

## Review Notes
- The `/ping` endpoint must be explicitly enabled via configuration (e.g., `allowed_networks` and `allow_ping`) on more recent chproxy versions; readers should consult the configuration spec when deploying in restricted environments.
- The `caches` example is correct in shape, but production deployments should consider `max_payload_size` and grace periods (`grace_time`) to avoid thundering herd issues; not added to keep within the post's scope.
- Heartbeat default `interval` is 5s and default `request` path is `/ping` in current chproxy; the example uses 10s/`/ping`, which is also valid.
