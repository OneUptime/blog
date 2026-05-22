# Validation Summary: How to Configure Base Ejection Time for Outlier Detection

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule
- Envoy outlier detection
- Kubernetes liveness probes
- Kubernetes kubectl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Envoy outlier detection architecture overview: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy outlier detection API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/

## Issues Found
- The post described `interval` as controlling how quickly consecutive-error ejections are detected. Envoy documents that consecutive 5xx ejection can run inline as errors are reported, while `interval` is the ejection analysis sweep interval and is also used for host return/multiplier checks. Updated the explanation and sequence diagram.
- The post described ejection duration only as `baseEjectionTime * number_of_times_ejected`. Istio documents that formula, and Envoy additionally documents an internal `max_ejection_time` cap. Added a short caveat while keeping the Istio-focused guidance intact.
- The monitoring section used `ejections_total`, which Envoy marks as deprecated. Updated the guidance to use `ejections_enforced_total` and to compare typed detected/enforced counters, with `ejections_overflow` as the signal for `maxEjectionPercent` limiting.
- The DestinationRule examples used `networking.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` API version used by Istio's current documentation.

## Review Notes
The Kubernetes liveness probe fields and timing explanation are generally correct, but real restart timing also depends on timeout, termination grace period, container startup time, image/runtime behavior, and whether startup/readiness probes are configured.
