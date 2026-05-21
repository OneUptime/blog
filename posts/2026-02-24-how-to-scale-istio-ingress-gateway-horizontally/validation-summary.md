# Validation Summary: How to Scale Istio Ingress Gateway Horizontally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateways
- Kubernetes Deployments, Services, HPA, PDB, pod scheduling, and topology spread constraints
- Envoy proxy concurrency and metrics
- Prometheus metrics
- Load testing with hey and k6

## Sources Consulted
- Istio: Installing Gateways - https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio: Customizing the installation configuration - https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio: IstioOperator Options - https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio: ProxyConfig - https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio: Istio 1.18 Upgrade Notes, Proxy Concurrency changes - https://istio.io/latest/news/releases/1.18.x/announcing-1.18/upgrade-notes/
- Istio: Global Mesh Options / ProxyConfig terminationDrainDuration - https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio: Standard Metrics - https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes: HorizontalPodAutoscaler walkthrough and autoscaling/v2 metrics - https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Kubernetes: Horizontal Pod Autoscaling concepts - https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes: Pod lifecycle and default termination grace period - https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Envoy: Threading model - https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/intro/threading_model
- Envoy: Server statistics - https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/statistics
- Envoy: Listener statistics - https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats

## Issues Found
- The default gateway replica statement was too specific. Updated it to say the gateway starts with a small initial replica count and that HPA creation depends on the installation method.
- The resource section said HPA needs both requests and limits. Corrected this to explain that utilization-based HPA depends on resource requests, while limits are optional but commonly useful for predictable pod budgets.
- The IstioOperator `hpaSpec` example used the older `targetAverageUtilization` style. Updated it to the current nested `target.type: Utilization` and `target.averageUtilization` format.
- The high-traffic tuning example used `ISTIO_META_ROUTER_MODE=sni-dnat`, which is for AUTO_PASSTHROUGH/multinetwork behavior and is not a general performance tuning setting. Replaced it with the supported `proxy.istio.io/config` concurrency example.
- The Envoy worker-thread explanation said Envoy defaults to one worker per CPU core. Current Istio determines unset proxy concurrency from the proxy container CPU limit. Updated the explanation.
- The monitoring section described `envoy_server_total_connections` as active connections. Replaced that active-connection guidance with `envoy_listener_downstream_cx_active` and clarified what `envoy_server_total_connections` represents.
- The connection-draining section attributed the 30-second termination grace period to Istio. Corrected it to Kubernetes and added Istio `terminationDrainDuration` configuration alongside `terminationGracePeriodSeconds`.

## Review Notes
The throughput table is appropriately caveated as a rough guide, but it is not an official Istio or Envoy benchmark. Future revisions would be stronger if they linked to measured benchmark methodology or replaced the numbers with workload-specific load-testing guidance.
