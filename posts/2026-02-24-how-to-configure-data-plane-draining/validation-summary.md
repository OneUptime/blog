# Validation Summary: How to Configure Data Plane Draining

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Kubernetes Deployments and Pod lifecycle hooks
- Prometheus / PromQL
- gRPC and WebSocket connection draining

## Sources Consulted
- Istio Global Mesh Options / ProxyConfig: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyConfig
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio 1.12 change notes: https://istio.io/latest/news/releases/1.12.x/announcing-1.12/change-notes/
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Pod Lifecycle: https://v1-34.docs.kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Envoy draining documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/draining
- Envoy access log response flags: https://www.envoyproxy.io/docs/envoy/latest/configuration/advanced/substitution_formatter.html

## Issues Found
- The Kubernetes shutdown sequence listed endpoint removal and SIGTERM ordering too simplistically. Updated it to reflect that EndpointSlices are updated during termination, `preStop` hooks run before the container stop signal, and the stop signal is usually SIGTERM.
- The Envoy draining behavior said inbound listeners stop accepting new connections and that the proxy exits as soon as all connections close. Updated this to match Envoy and Istio behavior: Envoy discourages new HTTP requests during graceful drain, and Istio waits for the configured drain duration unless zero-active-connection exit is enabled.
- The Kubernetes grace-period guidance did not mention that `preStop` hook time consumes the pod termination grace period. Updated the rule of thumb to include `preStop` sleep time in the budget.
- The endpoint propagation section said Kubernetes removes the pod from Service endpoints. Updated this to EndpointSlice language and clarified that the hook delays application SIGTERM while endpoint updates propagate.
- The gRPC section used a `DestinationRule` with `h2UpgradePolicy: DEFAULT` as if it configured GOAWAY/draining. Removed that misleading snippet and clarified that GOAWAY is part of Envoy HTTP/2 draining behavior, while `h2UpgradePolicy` controls HTTP/2 upgrades and is not a drain setting.

## Review Notes
The examples are illustrative and omit production details such as selectors and labels in Deployment manifests. The PromQL examples are syntactically valid, but operators may want to scope them with labels such as workload, namespace, reporter, or destination service in real deployments.
