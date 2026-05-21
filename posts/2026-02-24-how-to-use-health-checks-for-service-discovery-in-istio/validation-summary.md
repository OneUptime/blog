# Validation Summary: How to Use Health Checks for Service Discovery in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes readiness probes
- Kubernetes EndpointSlices
- Kubernetes Services and headless Services
- Istio DestinationRule
- Istio ServiceEntry
- Prometheus metrics

## Sources Consulted
- Kubernetes documentation: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Service and Endpoints deprecation - https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes documentation: EndpointSlices - https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Istio documentation: DestinationRule reference - https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio documentation: ServiceEntry reference - https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio documentation: Locality failover - https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio documentation: istioctl proxy-config endpoint command - https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: Envoy statistics through pilot-agent - https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Envoy documentation: Outlier detection - https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier

## Issues Found
- The post described Kubernetes service discovery primarily through the legacy Endpoints API. Kubernetes v1.33 deprecates Endpoints in favor of EndpointSlices, so the wording and watch command were updated to use EndpointSlices while still acknowledging legacy Endpoints.
- The post said Envoy checks every `interval` before ejecting an endpoint for consecutive 5xx errors. Envoy performs consecutive-5xx ejection inline; `interval` is used for periodic sweeps and recovery checks. The explanation was corrected.
- The Kubernetes readiness-probe latency numbers were too precise and implied guaranteed propagation times. They were changed to describe the probe threshold and propagation as cluster-dependent.
- The combined Deployment example was not a valid Deployment because it lacked a selector, pod labels, and a container image. Those required fields were added.
- Istio networking examples used `networking.istio.io/v1beta1`. The examples were updated to current `networking.istio.io/v1` APIs.
- The locality failover example used zone-like values in the `failover` field. Istio's `failover` policy is region-based, so the example and explanation were corrected.
- The ServiceEntry section stated that Envoy always stops sending traffic to an ejected external endpoint. This was qualified because Envoy can still route during panic or fail-open behavior when no healthy alternatives exist.

## Review Notes
The post is technically sound after the corrections. Future improvements could mention that Kubernetes HTTP probes treat any 2xx or 3xx status as success, even though using 200 for healthy and 503 for unhealthy is a common application convention.
