# Validation Summary: How to Configure Redis with Envoy Proxy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Envoy Proxy (redis_proxy network filter)
- Redis
- TLS termination via Envoy transport sockets
- Envoy admin stats endpoint

## Sources Consulted
- Envoy Redis Proxy filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/redis_proxy_filter
- Envoy RedisProxy v3 proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/redis_proxy/v3/redis_proxy.proto
- Envoy DownstreamTlsContext proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto
- Envoy cluster configuration reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto

## Issues Found

1. **Incorrect stat name prefix**: All example stat names were missing the `redis.` root prefix. Envoy Redis proxy stats follow the pattern `redis.<stat_prefix>.<stat_name>`. Changed e.g. `redis_stats.command.get.total` to `redis.redis_stats.command.get.total`.

2. **Wrong connection stat name**: `upstream_cx_active` is a cluster-level stat, not a filter-level stat. The filter-level stat for active connections is `downstream_cx_active`. Changed both the example output and the monitoring section reference.

3. **Fabricated latency percentile stat**: The stat `redis_stats.command.get.latency_us_p50` does not exist in Envoy. Envoy exposes command latency as histograms (displayed with all quantiles on a single line), not as individual percentile key-value pairs. Removed this line from the example output.

## Review Notes
- The Envoy config omits the `admin` block, which is required for the stats endpoint on port 9901 to work. This is acceptable for a focused tutorial but readers should be aware they need to add an admin block to their config.
- The `lb_policy` field is omitted from the cluster config, which is fine as it defaults to `ROUND_ROBIN`.
- All YAML configuration structures, filter names, type URLs, and field names are correct per the Envoy v3 API.
