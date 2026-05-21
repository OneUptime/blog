# Validation Summary: How to Implement Health Check Pattern with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio sidecar injection and probe rewriting
- Kubernetes liveness, readiness, startup, HTTP, TCP, and gRPC probes
- Envoy outlier detection and admin statistics
- Istio DestinationRule
- Istio PeerAuthentication and mTLS
- Prometheus metrics and alerts

## Sources Consulted
- Istio Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio Sidecar Injection Problems: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio Application Requirements / sidecar ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Envoy Outlier Detection documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier
- Envoy Cluster Statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy Admin Interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin

## Issues Found
- The description claimed the post covered Envoy active health checking, but the implementation covered passive outlier detection and sidecar readiness. Changed the description to avoid claiming active health checking coverage.
- The probe rewrite explanation said pilot-agent handles mTLS termination. Istio documentation describes probe rewriting to the sidecar agent, which redirects HTTP/gRPC probes to the application and returns the response code; it is not an mTLS termination flow. Updated the wording.
- The probe verification command inspected the `istio-proxy` args, which does not verify rewritten app probes. Replaced it with a command that reads the rewritten application container probe.
- Istio examples used `networking.istio.io/v1beta1` and `security.istio.io/v1beta1`. Updated DestinationRule and PeerAuthentication examples to current stable `v1` API versions.
- The `baseEjectionTime` explanation said ejection duration doubles while showing a linear sequence. Corrected it to Istio/Envoy's multiplier behavior: base time multiplied by the number of consecutive ejections.
- The `minHealthPercent` explanation described the behavior as panic mode. Corrected it to match Istio's documented behavior: outlier detection is disabled below the threshold and Envoy load balances across all endpoints.
- The PeerAuthentication example did not mention that `portLevelMtls` keys are workload ports, not Kubernetes Service ports. Added that caveat.
- The gRPC probe version note said Kubernetes 1.24+ supports native gRPC probes without qualification. Updated it to state that gRPC probes are stable in Kubernetes 1.27+ and were beta in 1.24 through 1.26.
- The Prometheus example used `envoy_cluster_outlier_detection_ejections_total`, which Envoy marks as deprecated. Replaced it with `envoy_cluster_outlier_detection_ejections_enforced_total`.

## Review Notes
- The examples are still intentionally illustrative and omit production fields such as selectors, full Deployment metadata, Service definitions, and alert label aggregation. Those omissions are acceptable for the focused snippets in this post.
- PeerAuthentication `DISABLE` mode is supported for sidecar-mode port exceptions but is not supported in Istio ambient mode.
