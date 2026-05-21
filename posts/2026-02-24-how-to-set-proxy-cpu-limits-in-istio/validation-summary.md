# Validation Summary: How to Set Proxy CPU Limits in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio sidecar injection and proxy annotations
- IstioOperator and Helm configuration
- Envoy proxy concurrency
- Kubernetes CPU requests and limits
- kubectl
- Prometheus and container CPU metrics

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Global Mesh Options and ProxyConfig: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Installing the Sidecar: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio Install with Helm: https://istio.io/latest/docs/setup/install/helm/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Kubernetes Resource Management for Pods and Containers: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Istio istiod Helm values: https://github.com/istio/istio/blob/master/manifests/charts/istio-control/istio-discovery/values.yaml

## Issues Found
- The post said Istio proxy `concurrency` defaults to 2. Current Istio documentation says leaving it unset is recommended and Istio automatically determines the worker count from CPU requests and limits; `0` uses all node cores while ignoring CPU requests and limits. Updated the concurrency explanation and rule of thumb accordingly.
- The "Reduce telemetry overhead" example included `holdApplicationUntilProxyStarts: true`, which delays application startup until the proxy is ready and does not reduce proxy CPU usage. Removed that field and renamed the subsection to "Reduce metrics merge overhead" to match `enablePrometheusMerge: false`.
- The Helm example placed `concurrency` under `global.proxy`. Current Istio Helm values use `meshConfig.defaultConfig.concurrency` for proxy concurrency. Moved the field to the correct location.

## Review Notes
The sizing examples are workload-dependent guidance rather than guaranteed values. The annotations and IstioOperator resource examples are valid for injected sidecar proxies; gateway resource sizing may need chart-specific configuration when using the separate Istio gateway Helm chart.
