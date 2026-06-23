# Validation Summary: How to Configure Load Balancing Algorithms in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy
- Istio DestinationRule and VirtualService resources
- Prometheus metrics
- istioctl

## Sources Consulted
- Istio Traffic Management documentation: https://istio.io/latest/docs/concepts/traffic-management/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio API proto for DestinationRule: https://raw.githubusercontent.com/istio/api/master/networking/v1alpha3/destination_rule.proto
- Envoy load balancing documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancing

## Issues Found
- The post stated that Round Robin is Istio's default load balancing algorithm. Current Istio documentation says the default is least-request. Updated the Round Robin section, comparison table, and best practices to reflect `LEAST_REQUEST` as the default.
- The post used `LEAST_CONN` throughout. Istio marks `LEAST_CONN` as deprecated and recommends `LEAST_REQUEST`. Replaced `LEAST_CONN` examples and explanations with `LEAST_REQUEST` and updated wording from active connections to outstanding requests.
- Several connection pool comments described the wrong fields. Updated comments for `h2UpgradePolicy`, `http1MaxPendingRequests`, `http2MaxRequests`, and `maxRetries` to match the Istio API reference.
- The locality-aware routing example said outlier detection is required for locality load balancing generally. Istio requires outlier detection for locality failover policies; with distribute rules it is useful but not the same requirement. Updated the comment.
- The TLS example said `SIMPLE` mode does not verify the server certificate. Istio verifies with OS CA certificates by default unless verification is explicitly skipped or custom CA settings are used. Corrected the comment.
- The consistent hash examples used deprecated top-level `minimumRingSize`. Updated them to `ringHash.minimumRingSize`.
- The consistent hash header example said missing headers fall back to round-robin. Reworded this to avoid claiming a specific fallback behavior.
- The monitoring example claimed pod-level distribution while grouping by `destination_workload`. Updated the comments to describe workload-level metrics and clarified the Envoy active connection metric.

## Review Notes
The YAML snippets were parsed successfully after edits. The post still uses `networking.istio.io/v1beta1`, which remains widely used and is compatible with the stated Istio 1.18+ prerequisite, though current Istio examples often show `networking.istio.io/v1`.
