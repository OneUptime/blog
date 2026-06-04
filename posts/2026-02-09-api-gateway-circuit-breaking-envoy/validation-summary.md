# Validation Summary: How to Implement API Gateway Circuit Breaking with Envoy-Based Gateways

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Envoy Proxy circuit breakers
- Envoy outlier detection
- Istio DestinationRule and VirtualService resources
- Ambassador Edge Stack / Emissary-ingress Mapping and Module resources
- Kubernetes kubectl
- Prometheus Operator ServiceMonitor and PrometheusRule resources

## Sources Consulted
- Envoy circuit breaking architecture: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking
- Envoy circuit breaker API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/circuit_breaker.proto
- Envoy outlier detection architecture: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy outlier detection API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/outlier_detection.proto
- Envoy cluster statistics and circuit breaker statistics: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio circuit breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Ambassador Edge Stack circuit breaker documentation: https://www.getambassador.io/docs/edge-stack/latest/topics/using/circuit-breakers
- Emissary-ingress circuit breaker documentation: https://emissary-ingress.dev/docs/4.0/topics/using/circuit-breakers/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Corrected the Envoy overview to distinguish static circuit breaker resource limits from outlier detection. Envoy's cluster circuit breakers are not a traditional closed/open/half-open state machine driven by error rates; outlier detection handles per-host failure ejection.
- Updated Istio examples from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API version.
- Replaced Istio `consecutiveErrors` with `consecutive5xxErrors`, matching the current DestinationRule outlier detection field.
- Revised the progressive circuit breaking section because the example configures static per-subset thresholds, not dynamic tightening as error rates increase.
- Removed unsupported `outlier_detection` fields from the Ambassador Mapping example. Official Ambassador Edge Stack and Emissary-ingress circuit breaker docs document `circuit_breakers` on Module, Mapping, TCPMapping, and AuthService, but not Mapping-level Envoy outlier detection in that form.
- Corrected retry wording to avoid implying one request can create hundreds of retries when `attempts: 3` is configured.
- Corrected the fortio comment from "Install fortio" to starting a fortio pod, and fixed the stats grep from `user_service` to `user-service` to match the Istio cluster name shown in the expected output.
- Corrected Envoy circuit breaker statistics wording from counters incrementing to gauges becoming `1` when a breaker is at capacity.
- Updated Prometheus alert expressions to use `max_over_time` on Envoy gauge metrics instead of `increase` or `rate` on gauges.
- Revised the graceful degradation example and explanation. Istio does not automatically shift VirtualService route weights when a circuit breaker opens, so the post now describes a fixed fallback percentage and notes that alerts or application logic are needed to increase fallback traffic during an incident.

## Review Notes
The ServiceMonitor example remains environment-dependent because the selected labels and port name must match the actual Istio ingressgateway Service in the user's cluster. The snippets are otherwise aligned with current official Envoy, Istio, Ambassador/Emissary, Kubernetes, and Prometheus Operator documentation as of 2026-06-04.
