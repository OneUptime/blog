# Validation Summary: How to Configure Envoy Load Balancing Policies for IPv4 Endpoints

## Status
validated

## Post Type
Guide

## Technologies Covered
- Envoy Proxy
- Envoy v3 cluster configuration
- Envoy HTTP routing and hash policies
- YAML configuration
- Bash, `curl`, and `jq`

## Sources Consulted
- Envoy cluster configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy supported load balancers overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers.html
- Envoy HTTP route components proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy administration interface docs: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy admin `/clusters` proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/clusters.proto.html
- Envoy endpoint configuration proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint.proto

## Issues Found
- The short description for `LEAST_REQUEST` said it routes to the endpoint with the fewest active requests. That is not how Envoy documents the built-in policy in general; with equal weights it picks from a random subset of hosts and then chooses the one with fewer active requests. I updated the wording to match Envoy's documented behavior.
- The "Weighted Round Robin" entry implied a distinct `lb_policy` value. In Envoy's built-in round-robin behavior, weighted endpoint distribution is achieved by using `lb_policy: ROUND_ROBIN` together with endpoint `load_balancing_weight` values. I updated the comment to make that explicit.
- The route hash-policy comment said it hashes on client IPv4. Envoy's documented `source_ip` hash policy hashes on the client source IP address generally, not only IPv4. I corrected the comment.
- The verification command said `/stats` could be used to view per-endpoint request counts by grepping `upstream_rq_total`. That stat is cluster-wide. Envoy documents per-host request counters under the admin `/clusters` endpoint. I replaced the command with a `/clusters?format=json` example that reads host-level `rq_total` values.
- The request-loop example relied on each backend response already ending with a newline. Without that, repeated `curl` output can be concatenated and miscounted by `sort | uniq -c`. I changed the loop to print each response as exactly one line with `printf`, so the distribution check remains correct for simple backend ID responses.

## Review Notes
- The examples use the current Envoy v3 API fields for built-in load balancer selection, including `lb_policy`, `least_request_lb_config`, `ring_hash_lb_config`, route `hash_policy`, and endpoint `load_balancing_weight`.
- The weighted endpoint percentages shown in the example are accurate for a single locality with healthy endpoints. In Envoy, endpoint weights are applied within a locality and can also be combined with locality weighting.
