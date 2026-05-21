# Validation Summary: How to Configure Istio Resource Limits and Requests

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecar proxies
- IstioOperator
- Helm chart values
- Prometheus and cAdvisor metrics

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio Sidecar Injection customization notes: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- IstioOperator options reference: https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/
- Istio Helm installation documentation: https://istio.io/latest/docs/setup/install/helm/
- Istio Gateway installation documentation: https://istio.io/latest/docs/setup/additional-setup/gateway/
- Istio configuration scoping documentation: https://istio.io/latest/docs/ops/configuration/mesh/configuration-scoping/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Current Istio Helm chart values and sidecar injection template: https://github.com/istio/istio/tree/master/manifests/charts

## Issues Found
- The opening text implied all Istio workloads always get sidecars. Updated the wording to clarify this applies to sidecar mode and sidecar-injected pods, since current Istio also supports ambient mode.
- The per-pod override Deployment example was missing the required `spec.selector` and matching pod labels for an `apps/v1` Deployment. Added a selector and labels.
- The concurrency section said Envoy defaults to 2 worker threads. Current Istio documentation says unset concurrency is automatically determined from proxy CPU limits, so the explanation was corrected.
- The init-container resources section used `global.proxy_init.resources`, which does not match current Istio sidecar injection templates. Updated it to explain that `istio-init` uses the same resource template as `istio-proxy` and changed the snippet to `global.proxy.resources`.
- The OOM kill check used a Kubernetes event reason selector for `OOMKilled`, but OOMKilled is commonly found in container termination state. Replaced it with a `kubectl get pods` JSONPath command that checks the `istio-proxy` container's last terminated reason.
- The CPU throttling check queried Envoy connection count, not CPU throttling. Replaced it with a Prometheus/cAdvisor throttled-period ratio query for `istio-proxy`.

## Review Notes
The sizing tables are reasonable starting points, but they are workload-specific guidance rather than official fixed recommendations. The post now makes clear that actual resource settings should be based on observed usage.
