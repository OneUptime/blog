# Validation Summary: How to Configure Envoy Proxy Circuit Breakers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy Proxy
- Kubernetes
- DestinationRule configuration
- Circuit breaking
- Outlier detection
- Fortio load testing
- Envoy metrics / Prometheus metrics

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Debugging Envoy and Istiod: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Envoy circuit breaking architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy cluster manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats

## Issues Found
- Clarified `tcp.maxConnections` to match Istio's definition: it limits HTTP/1.1 or TCP connections to each destination host, and requests may wait for an available connection or be rejected when capacity is exhausted.
- Corrected the `http.http1MaxPendingRequests` explanation. Istio documents it as the maximum requests queued while waiting for a ready connection pool connection, and notes that it applies to both HTTP/1.1 and HTTP/2.
- Corrected the `http.http2MaxRequests` explanation. Istio documents it as the maximum active requests to a destination, applicable to both HTTP/1.1 and HTTP/2, though it remains especially important for HTTP/2 traffic.
- Replaced the deprecated `envoy_cluster_outlier_detection_ejections_total` metric recommendation with `envoy_cluster_outlier_detection_ejections_enforced_total`, which Envoy documents as the current counter for enforced ejections due to any outlier type.
- Updated the Fortio test from 100 concurrent requests to 200 concurrent requests for a configuration with `maxConnections: 100` and `http1MaxPendingRequests: 50`. Sending only 100 concurrent requests would not reliably exceed those limits.

## Review Notes
The `networking.istio.io/v1` `DestinationRule` examples use current field names and valid structure. The `istioctl proxy-config cluster --fqdn ... -o json`, Envoy admin `/stats`, and Fortio commands are consistent with official Istio examples. The external Fortio manifest URL references Istio release 1.24 and remains plausible for a version-pinned sample, though future posts may prefer matching the sample URL to the reader's installed Istio version.
