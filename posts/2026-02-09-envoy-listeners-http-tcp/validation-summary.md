# Validation Summary: How to configure Envoy listeners for HTTP and TCP traffic

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Envoy listeners
- Envoy HTTP Connection Manager
- Envoy TCP proxy
- Envoy listener filters: TLS Inspector, HTTP Inspector, Proxy Protocol, Original Destination
- Envoy TLS transport sockets
- Envoy original destination clusters
- Envoy admin interface
- Prometheus metrics and alerts

## Sources Consulted
- Envoy listener architecture: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/listeners/listeners
- Envoy listener configuration API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener.proto.html
- Envoy listener components / filter-chain matching API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener_components.proto.html
- Envoy HTTP Connection Manager API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy HTTP Inspector listener filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/http_inspector
- Envoy TLS Inspector listener filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/tls_inspector
- Envoy Proxy Protocol listener filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/proxy_protocol
- Envoy Original Destination listener filter: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/listener_filters/original_dst_filter
- Envoy cluster configuration API / ORIGINAL_DST clusters: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy listener statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Envoy HTTP connection manager statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_conn_man/stats
- Envoy TCP proxy statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/tcp_proxy_filter
- Envoy admin interface and logging endpoint: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy command-line logging options: https://www.envoyproxy.io/docs/envoy/latest/operations/cli.html

## Issues Found
- The transparent proxy example said to use the original destination filter but did not configure `envoy.filters.listener.original_dst`, and it used `use_original_dst: true`, whose documented behavior is listener handoff to another matching listener. Added the `original_dst` listener filter and adjusted the explanation to describe restoring the original destination for use by an `ORIGINAL_DST` cluster.
- The monitoring section listed `envoy_listener_downstream_cx_rx_bytes_total` and `envoy_listener_downstream_cx_tx_bytes_total` as listener metrics. Envoy documents byte counters under HTTP connection manager and TCP proxy filter stats, not listener stats. Replaced them with documented listener counters for rejected connections and unmatched filter chains.
- The debugging section used `jq '.configs[1]'` for `config_dump`, which depends on array ordering. Replaced it with a `jq` filter that selects the `ListenersConfigDump` entry by type.
- The post said the admin `access_log` snippet enabled debug logging for listeners, but it configures admin access logging. Renamed that text and added correct examples for enabling debug-level Envoy logging at startup or through the admin `/logging` endpoint.

## Review Notes
- The configuration snippets are partial examples and assume matching cluster definitions, certificates, and bootstrap configuration exist where omitted.
- The HTTP Inspector example uses protocol detection to select a filter chain by `application_protocols`, which is documented for the HTTP Inspector, but this filter is documented as intended for trusted deployments.
- The `exact_balance` connection balancer is technically valid, but Envoy documents that it trades accept throughput for more exact balancing and is best suited to small numbers of long-lived connections.
