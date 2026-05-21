# Validation Summary: How to Set Maximum Retry Attempts in Istio

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio VirtualService retry policies
- Istio DestinationRule connection pool and outlier detection settings
- Envoy retry policies and retry statistics
- Kubernetes kubectl commands
- YAML configuration

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio fault injection task documentation: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Envoy router retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- Updated Istio manifests from `networking.istio.io/v1beta1` to the current stable `networking.istio.io/v1` API version used by Istio's reference documentation.
- Corrected the retry testing section. The original version suggested using Istio fault injection and retries on the same route, but Istio documents that timeouts and retries are not enabled when client-side faults are configured. The section now recommends testing against a service that returns intermittent 503 responses instead.

## Review Notes
The retry attempt counting, `attempts: 0` behavior, `perTryTimeout` and route timeout interaction, supported `retryOn` values, DestinationRule fields, and Envoy retry statistics were consistent with official Istio and Envoy documentation after the edits.
