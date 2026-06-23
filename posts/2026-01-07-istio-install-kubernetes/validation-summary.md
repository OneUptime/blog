# Validation Summary: How to Install Istio Service Mesh on Kubernetes

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Istio
- Kubernetes
- istioctl
- IstioOperator
- Envoy sidecars
- Istio Gateway and VirtualService APIs
- Bookinfo sample application
- Prometheus, Grafana, Jaeger, and Kiali

## Sources Consulted
- Istio Getting Started: https://istio.io/latest/docs/setup/getting-started/
- Istio install with istioctl: https://istio.io/latest/docs/setup/install/istioctl/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- IstioOperator API reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio supported releases: https://istio.io/latest/docs/releases/supported-releases/
- Istio Bookinfo documentation: https://istio.io/latest/docs/examples/bookinfo/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Kiali task: https://istio.io/latest/docs/tasks/observability/kiali/
- Istio Jaeger tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/jaeger/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The post used Istio 1.24.0 and `release-1.24` sample URLs. Istio 1.24 is no longer supported as of June 23, 2026, so examples were updated to Istio 1.30.1 and `release-1.30`.
- The Kubernetes prerequisite claimed Istio requires Kubernetes 1.25 or later. Updated it to refer to the supported Kubernetes versions for the selected Istio release, specifically Istio 1.30 support for Kubernetes 1.32 through 1.36.
- The `kubectl version --short` command is no longer listed in current Kubernetes documentation. Replaced it with `kubectl version`.
- The architecture diagram described `istiod` as `Pilot + Citadel + Galley`, which is outdated. Updated it to describe discovery, configuration, and CA responsibilities.
- The Linux package manager section described `downloadIstioctl` as an apt repository step and included a snap command that is not part of current official Istio install guidance. Replaced it with the official standalone istioctl binary installation flow.
- The profiles table omitted `remote` and `preview`, and described ambient mode as experimental. Updated the profile list and diagram to match current Istio documentation.
- The IstioOperator HPA metric used the old `targetAverageUtilization` shape. Updated it to use `target.type: Utilization` and `target.averageUtilization`.
- Pod-level sidecar injection examples used annotations for `sidecar.istio.io/inject`. Current Istio documentation describes this as a pod label, so the examples were changed to `metadata.labels`.
- The sidecar injection diagram implied an init container is always present. Updated it to say the init container is optional.
- A Bookinfo verification comment incorrectly said the command runs curl inside a temporary pod. Corrected it to say the command runs inside the ratings pod.
- The uninstall section did not remove the sample add-ons. Added deletion commands for the installed add-on manifests before uninstalling Istio.

## Review Notes
The sample add-on manifests are intended by Istio for demonstration and are not tuned for production performance or security. The guide remains technically valid as an installation tutorial, but production deployments should replace sample observability add-ons with managed or hardened installations.
