# Validation Summary: How to Diagnose Envoy Proxy High CPU Usage in Istio

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio
- Envoy
- Kubernetes
- Prometheus
- Istio Telemetry API
- Istio networking APIs: DestinationRule, Sidecar, ProxyConfig

## Sources Consulted
- Istio Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Sidecar reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Envoy Statistics guide: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio pilot-agent command reference: https://istio.io/latest/docs/reference/commands/pilot-agent/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy administration interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described Envoy stats counter checks as request, TLS handshake, and connection creation rates. Envoy admin `/stats` output exposes counters, so I changed the wording to say these commands inspect counters and that the reader should sample over time or use Prometheus `rate()` to calculate rates.
- The post used `sidecar.istio.io/concurrency` to adjust worker threads. Current Istio documentation exposes concurrency through `ProxyConfig`, either as a `ProxyConfig` resource or through the `proxy.istio.io/config` pod annotation. I updated the examples to use `proxy.istio.io/config` with `concurrency`.
- The post stated that Envoy uses 2 worker threads by default. Current Istio ProxyConfig documentation says an unset concurrency is automatically determined based on CPU limits, with `0` meaning all machine cores. I updated the explanation accordingly.

## Review Notes
The remaining commands and configuration snippets are consistent with current Istio, Envoy, Kubernetes, and Prometheus documentation. The CPU profiling section references Envoy server information rather than showing a full profiling workflow; that is acceptable as a lightweight diagnostic step, but a future revision could add a separate, caveated example for Envoy's `/cpuprofiler` admin endpoint because it requires appropriate build support and POST requests.
