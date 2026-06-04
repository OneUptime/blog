# Validation Summary: How to Implement Circuit Breaking with Custom Outlier Detection in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule and VirtualService
- Envoy circuit breaking and outlier detection
- Kubernetes manifests and kubectl
- Fortio load testing
- Prometheus and PrometheusRule alerting

## Sources Consulted
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy cluster manager statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy outlier detection overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Fortio usage documentation: https://github.com/fortio/fortio
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Updated Istio examples from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API version used in the official Istio 1.30 documentation.
- Replaced invalid/old `consecutiveErrors` fields with `consecutive5xxErrors`, which is the current Istio DestinationRule outlier detection field.
- Removed unsupported Istio DestinationRule fields: `maxEjectionTime`, `enforcingConsecutive5xx`, `enforcingConsecutiveGatewayFailure`, `enforcingSuccessRate`, `successRateMinimumHosts`, `successRateRequestVolume`, and `successRateStdevFactor`.
- Added `splitExternalLocalOriginErrors: true` where `consecutiveLocalOriginFailures` is configured, because Istio only takes that threshold into account when local-origin error splitting is enabled.
- Replaced wildcard Kubernetes service hosts such as `"*.production.svc.cluster.local"` with concrete service FQDNs, since DestinationRules apply to services in the registry and wildcard namespace-wide Kubernetes service rules are misleading.
- Corrected the monitoring section wording from deploying a `ServiceMonitor` to creating a dashboard `ConfigMap`, matching the manifest shown.
- Replaced the deprecated Envoy `ejections_total` metric query with `ejections_enforced_total`.
- Updated the ejected-instance alert denominator from `envoy_cluster_membership_healthy` to `envoy_cluster_membership_total` so the expression measures ejected hosts against total cluster membership.
- Added the Fortio `-H "x-test-fault: true"` flag when testing the VirtualService fault injection rule, because the rule only matches requests with that header.
- Corrected the ejection recovery explanation from exponential doubling to Istio's documented linear multiplication of `baseEjectionTime` by the number of times a host has been ejected.
- Reworded the VirtualService fault injection test so it does not incorrectly claim that proxy-injected aborts directly trigger endpoint outlier ejection.

## Review Notes
The examples are now aligned with current Istio DestinationRule fields and Envoy metrics. The post still uses illustrative service names and assumes the target namespaces have Istio sidecar injection or equivalent mesh participation enabled.
