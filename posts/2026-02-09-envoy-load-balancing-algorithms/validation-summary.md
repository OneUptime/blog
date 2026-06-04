# Validation Summary: How to implement Envoy load balancing algorithms

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Envoy Proxy
- Envoy upstream clusters
- Envoy load balancing policies
- Envoy HTTP route hash policies
- Envoy Prometheus metrics
- YAML configuration

## Sources Consulted
- Envoy supported load balancers: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers.html
- Envoy cluster v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy priority levels: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/priority
- Envoy cluster manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The least request description said Envoy sends requests to the host with the fewest active requests. Envoy's equal-weight least request algorithm samples a configurable number of random healthy hosts and picks the least loaded among those, so the description was updated.
- The ring hash description said the same request always goes to the same backend. Consistent hashing preserves affinity while the host set and hash policy remain stable, so the wording was made less absolute.
- The Maglev description claimed better distribution than ring hash. Envoy documents Maglev primarily as a faster consistent-hashing option with a fixed-size table, and notes tradeoffs in stability when hosts change, so the wording was corrected.
- The slow start YAML used `common_lb_config.slow_start_config`, which is not a valid current Envoy v3 cluster field. It was changed to `round_robin_lb_config.slow_start_config` with an explicit `ROUND_ROBIN` load balancing policy.
- The monitoring section labeled `envoy_cluster_lb_subsets_selected` as a per-host request metric. That metric counts load balancer subset selections, while `envoy_cluster_upstream_rq_total` and `envoy_cluster_upstream_rq_active` are cluster request metrics. The metric labels were corrected.
- The best practices section recommended monitoring per-host metrics without noting that per-endpoint stats are optional. It now says to enable per-endpoint stats when per-host distribution is needed.

## Review Notes
The examples are partial Envoy configuration snippets rather than complete bootstrap files. The core v3 field names and load balancing policy values are current, but a future improvement could show each snippet inside a full `static_resources.clusters` or route configuration context.
