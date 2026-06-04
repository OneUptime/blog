# Validation Summary: How to implement Envoy clusters for backend service discovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy clusters
- Envoy service discovery
- STRICT_DNS, LOGICAL_DNS, EDS, STATIC, and ORIGINAL_DST cluster types
- Envoy endpoint priority failover
- Envoy circuit breakers and upstream HTTP protocol options
- Envoy upstream TLS
- Envoy outlier detection
- Envoy cluster metrics
- Kubernetes Service DNS behavior

## Sources Consulted
- Envoy service discovery documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/service_discovery
- Envoy Cluster v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy endpoint and LocalityLbEndpoints v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto
- Envoy priority levels documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/priority
- Envoy HTTP upstream protocol options v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy circuit breakers v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy TLS transport socket v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/transport_sockets/tls/v3/tls.proto
- Envoy outlier detection v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats

## Issues Found
- The STRICT_DNS summary incorrectly described the mode as "strict health checking." Changed it to explain that each returned DNS IP address becomes a cluster host.
- The Kubernetes DNS explanation said Kubernetes Services return multiple pod IPs. Changed this to specify headless Services; normal ClusterIP Services usually return the service virtual IP.
- The priority-level example used `socket_socket`, which is not a valid Envoy address field. Changed it to `socket_address`.
- The priority-level explanation said higher priorities are used only when lower priorities are unavailable. Changed it to reflect Envoy's documented behavior, where traffic shifts as enough lower-priority endpoints become unavailable or unhealthy.
- The connection pool example used the deprecated direct `http2_protocol_options` cluster field. Replaced it with `typed_extension_protocol_options` using `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`.

## Review Notes
The YAML snippets were parsed successfully after the fixes. Envoy is not installed in the local environment, so the snippets were not run through `envoy --mode validate`.
