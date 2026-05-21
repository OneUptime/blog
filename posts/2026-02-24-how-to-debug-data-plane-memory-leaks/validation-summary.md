# Validation Summary: How to Debug Data Plane Memory Leaks

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio sidecar data plane
- Envoy admin interface, statistics, heap dumps, and overload behavior
- Kubernetes `kubectl` commands and pod resource limits
- Prometheus and PromQL
- kube-state-metrics

## Sources Consulted
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/#ProxyConfig
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio custom metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Envoy admin interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy heap profile FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/debugging/how_to_dump_heap_profile_of_envoy
- Envoy overload manager documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/operations/overload_manager/overload_manager
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus `predict_linear` function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- Updated Istio `Sidecar`, `Telemetry`, and `DestinationRule` examples to current `networking.istio.io/v1` and `telemetry.istio.io/v1` API versions.
- Fixed the Envoy heap dump workflow. The post used `POST /heap_dump`, `ENVOY_HEAP_PROFILE`, and an expected `/tmp/envoy_heap.0001.heap` file. Envoy documents `GET /heap_dump` as returning the pprof-compatible heap profile in the response body, so the command now saves that response to `/tmp/envoy.heap` and copies that file.
- Corrected the standalone pprof command from `pprof --text` to `pprof -top`, matching common pprof CLI usage.
- Clarified stats cardinality language. Envoy keeps in-process stats, while Istio Prometheus telemetry creates labeled time series; the Telemetry API example now describes removing a previously added high-cardinality `request_host` dimension.
- Replaced the wildcard DestinationRule host with a concrete service FQDN. Istio DestinationRule `host` is a service-registry or ServiceEntry host, so `*.default.svc.cluster.local` is not an accurate general-purpose example.
- Corrected the overload-manager section so it no longer claims the shown `concurrency` annotation configures Envoy overload manager actions. The text now distinguishes Envoy overload manager behavior from Istio's simpler `ProxyConfig` concurrency lever.
- Added the current kube-state-metrics `unit="byte"` label to the memory limit query and added PromQL `on (namespace, pod, container)` vector matching in the alert expression so usage series compare correctly with limit series.

## Review Notes
The remaining commands are examples that assume a pod selected by `deploy/my-app`, an injected `istio-proxy` container, Envoy admin access on localhost port 15000, metrics-server for `kubectl top`, cAdvisor/container metrics, and kube-state-metrics in Prometheus. Those assumptions are normal for this kind of Istio troubleshooting guide.
