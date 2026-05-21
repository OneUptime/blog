# Validation Summary: How to Configure Maximum Connection Age in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule
- Istio EnvoyFilter
- Envoy HTTP connection manager
- Envoy upstream connection pooling and statistics
- HTTP/2 and GOAWAY
- gRPC
- Kubernetes Service load balancing
- Prometheus

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Envoy statistics docs: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Envoy connection pooling architecture: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/connection_pooling.html
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Envoy HTTP protocol options proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto
- Envoy HTTP connection manager proto: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy cluster statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- RFC 9113, HTTP/2: https://www.rfc-editor.org/rfc/rfc9113
- gRPC retry guide: https://grpc.io/docs/guides/retry/

## Issues Found
- The original post overstated that a single HTTP/2 connection in Istio necessarily pins all requests to one backend pod. Updated the explanation to distinguish Kubernetes connection-oriented Service load balancing from Istio/Envoy request-level HTTP and gRPC load balancing, while still noting that upstream HTTP/2 connection pools can remain long-lived.
- The `maxRequestsPerConnection` section described the setting as direct connection lifetime control. Updated it to describe request-count-based upstream connection reuse and Envoy draining behavior.
- The inbound EnvoyFilter used camelCase field names and omitted the filter `name` in the merge value. Updated the snippet to match Istio's documented EnvoyFilter examples with `typed_config`, `common_http_protocol_options`, and `max_connection_duration`.
- The outbound EnvoyFilter snippet was invalid because it merged an empty `typedPerFilterConfig` and did not configure maximum connection duration. Replaced it with the supported Istio `DestinationRule` `connectionPool.tcp.maxConnectionDuration` setting.
- The gRPC DestinationRule example did not include an actual time-based maximum connection duration. Added `maxConnectionDuration: 600s` under `connectionPool.tcp` and updated the explanatory bullet.
- The GOAWAY explanation implied automatic retries for all affected gRPC requests. Updated it to clarify that new streams use a new connection and retries depend on client retry policy and RPC safety.
- The PromQL example labeled a 95th percentile query as an average and did not aggregate histogram buckets. Updated the comment and query to use `sum by (le)`.
- The connection creation estimate was too broad for services with multiple connections or hosts. Scoped it to a single upstream connection carrying the stated request rate.

## Review Notes
EnvoyFilter remains a sharp tool and should be rechecked during Istio proxy upgrades, as Istio documents that Envoy xDS details can change across proxy versions. DestinationRule settings should be preferred where they provide the needed behavior.
