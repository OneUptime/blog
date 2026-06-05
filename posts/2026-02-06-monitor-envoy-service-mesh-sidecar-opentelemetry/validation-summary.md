# Validation Summary: How to Monitor Envoy Service Mesh Sidecar Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- Envoy
- Istio
- Kubernetes
- Prometheus scraping
- Python OpenTelemetry metrics API

## Sources Consulted
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio trace sampling task: https://preliminary.istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Envoy tracing architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/observability/tracing
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy cluster manager statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Collector Contrib v0.153.0 release: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.153.0

## Issues Found
- The introduction said the guide collected logs from Envoy, but the post only configures traces and metrics. Changed the wording to traces and metrics.
- The Istio tracing configuration used `openCensusAgent` while also defining an OpenTelemetry extension provider. Removed the OpenCensus agent block and kept the current OpenTelemetry `extensionProviders` configuration.
- The Telemetry API example used `telemetry.istio.io/v1alpha1`. Updated it to `telemetry.istio.io/v1`, matching current Istio documentation.
- The Prometheus receiver scrape config did not set Envoy's Prometheus path, so it would default to `/metrics` instead of `/stats/prometheus`. Added `metrics_path: /stats/prometheus`.
- The Collector config used `k8s_attributes`, while the documented Collector processor identifier is `k8sattributes`. Updated the processor name and pipeline references, and added `auth_type: serviceAccount`.
- The deployment used the outdated `otel/opentelemetry-collector-contrib:0.96.0` image. Updated it to `0.153.0`, the latest OpenTelemetry Collector Contrib release available during review.
- The resource-usage section suggested `hostmetrics` for sidecar CPU and memory. Updated it to `kubeletstats`, which is the Collector receiver intended for Kubernetes node, pod, and container metrics.
- The Python script looked for `cluster.upstream_cx_active`, but Envoy cluster stats include the cluster name, such as `cluster.<name>.upstream_cx_active`. Updated the script to sum matching cluster stats.
- The Python script did not check HTTP errors or set a timeout for the Envoy admin request. Added a timeout and `raise_for_status()`.
- The Python metric units used non-UCUM strings (`bytes`, `connections`). Updated them to `By` and `1`.
- The trace propagation wording said Envoy sidecars automatically propagate W3C Trace Context headers end to end. Updated the text to clarify that applications still need to forward trace headers on downstream calls.
- The alerting section referenced `upstream_cx_max`, which is not the right Envoy stat for connection breaker exhaustion. Updated it to use `upstream_cx_overflow` and `circuit_breakers.<priority>.cx_open`.

## Review Notes
The configuration snippets are valid examples, but a production Collector deployment also needs Kubernetes RBAC for `k8sattributes` and Prometheus Kubernetes service discovery. That operational detail was not added because it would expand the post beyond the requested targeted corrections.
