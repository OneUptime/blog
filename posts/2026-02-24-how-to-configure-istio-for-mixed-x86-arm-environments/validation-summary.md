# Validation Summary: How to Configure Istio for Mixed x86/ARM Environments

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecar injection
- IstioOperator
- VirtualService and DestinationRule traffic management
- Istio Prometheus metrics
- Kubernetes node selectors and node affinity
- Multi-architecture container images

## Sources Consulted
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio installation customization and IstioOperator components: https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio metric customization task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl describe documentation: https://istio.io/latest/docs/ops/diagnostic-tools/istioctl-describe/
- Kubernetes node labels populated by kubelet: https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes assigning pods to nodes: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Docker Hub Istio proxyv2 image tags: https://hub.docker.com/r/istio/proxyv2/tags
- Docker Hub CoreDNS image tags: https://hub.docker.com/r/coredns/coredns/tags

## Issues Found
- The IstioOperator text said the preferred affinity rules "pin" control plane components. Preferred affinity only biases scheduling, so the wording was changed to say it prefers specific nodes.
- The Wasm plugin warning implied Wasm modules generally need separate CPU-architecture builds. That is misleading for Wasm bytecode, so it was narrowed to native Envoy extensions and helper images used to distribute plugins.
- The traffic and monitoring examples needed consistent architecture labels. The workload examples now include architecture/version labels, and the monitoring guidance uses Istio's standard `destination_version` metric label instead of an unsupported custom node-label expression.
- The Telemetry example used `telemetry.istio.io/v1alpha1` and attempted to read `downstream_peer.labels['kubernetes.io/arch']`, which is not a supported Istio peer metadata expression. It was replaced with a Prometheus query based on the standard `destination_version` label.
- The resource-difference Deployment examples were missing required `apps/v1` selectors and pod template labels. These were added so the manifests are valid Kubernetes Deployments.

## Review Notes
The guide is technically sound after the fixes. The example assumes architecture-specific service variants are labeled consistently; in a production migration, teams should also verify their application image manifests publish both `linux/amd64` and `linux/arm64` variants before removing node selectors.
