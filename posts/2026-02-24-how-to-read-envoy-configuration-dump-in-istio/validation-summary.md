# Validation Summary: How to Read Envoy Configuration Dump in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- `istioctl`
- `pilot-agent`
- Envoy admin API
- Python
- jq

## Sources Consulted
- Istio `istioctl` command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio `pilot-agent request` command reference: https://istio.io/latest/es/docs/reference/commands/pilot-agent/
- Envoy ConfigDump API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump.proto
- Envoy shared ConfigDump API reference for clusters, listeners, routes, endpoints, scoped routes, and ECDS: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump_shared.proto
- Envoy dynamic configuration sandbox showing `/config_dump` JSON field names: https://www.envoyproxy.io/docs/envoy/latest/start/sandboxes/dynamic-config-cp.html

## Issues Found
- Several examples used lower-camel JSON field names such as `socketAddress`, `portValue`, `filterChains`, and `filterChainMatch`. Envoy `/config_dump` uses proto-style snake_case field names, so those examples would not read the expected values from a raw config dump. Updated the examples to use `socket_address`, `port_value`, `filter_chains`, and `filter_chain_match`.
- The cluster field list used lower-camel names such as `connectTimeout`, `circuitBreakers`, `transportSocket`, and `loadAssignment`. Updated these to the raw Envoy config dump field names: `connect_timeout`, `circuit_breakers`, `transport_socket`, and `load_assignment`.
- The inbound listener example matched only listener names containing `15006`. Istio commonly uses the `virtualInbound` listener name for the inbound capture listener, so the example could miss the listener. Updated the example to match either `virtualInbound` or a listener bound to port `15006`.
- The "Use jq for Quick Filtering" section did not actually use `jq`, and its circuit breaker example used lower-camel field names. Replaced those commands with jq filters that target `dynamic_active_clusters`, `circuit_breakers`, and `max_connections`.
- The list of main config dump sections omitted optional ECDS config dump entries. Added `EcdsConfigDump` as an optional section because current Envoy can emit ECDS configuration when configured.
- The direct Envoy admin API example assumed `curl` is available inside the proxy container. Added a caveat that the command applies when `curl` is available in the proxy image.

## Review Notes
The `istioctl proxy-config all <pod-name[.namespace]> -o json`, `pilot-agent request GET /config_dump`, and Envoy `/config_dump?include_eds` usage were consistent with official Istio and Envoy documentation. The post does not pin an Istio or Envoy version, so the review targeted current official documentation as of 2026-05-21.
