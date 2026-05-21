# Validation Summary: How to Tune Circuit Breaker Settings for Production in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio DestinationRule
- Istio VirtualService retries
- Envoy circuit breaking
- Envoy outlier detection
- Envoy statistics
- Kubernetes rolling deployments
- Prometheus queries

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy circuit breaking documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy outlier detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- Updated Istio examples from `networking.istio.io/v1beta1` to the current documented `networking.istio.io/v1` API version.
- Changed short service hosts in examples to fully qualified Kubernetes service hostnames where the examples are scoped to the `production` namespace, reducing ambiguity in DestinationRule and VirtualService host resolution.
- Added a caveat that Envoy statistics are per proxy instance and that Istio records only a minimal stat set by default, so upstream cluster stats may require `proxyStatsMatcher`.
- Corrected retry amplification math: Istio `retries.attempts: 3` allows three retries in addition to the original request, so 100 RPS can produce up to 400 attempts, not 300.
- Replaced the invalid mesh-wide wildcard DestinationRule example. DestinationRules apply to traffic for a specific service-registry host; `*.production.svc.cluster.local` is not a global default for every Kubernetes service.
- Corrected the deployment ejection example. Percent-based ejection limits are coarse with small host counts, and `maxEjectionPercent: 25` should not be described as preventing all ejection in a 3-pod pool.
- Softened the claim that `maxEjectionPercent: 25` always preserves exactly 75% capacity; the precise effect depends on pool size and outlier-ejection behavior.

## Review Notes
The remaining numeric tuning recommendations are reasonable heuristics rather than Istio defaults. They should be validated with workload-specific traffic, retry, and rollout behavior before production rollout.
