# Validation Summary: How to Configure Trace Sampling Rate in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio MeshConfig and ProxyConfig
- Envoy distributed tracing
- B3 trace propagation headers
- Kubernetes kubectl
- OpenTelemetry Collector tail sampling

## Sources Consulted
- Istio Configure trace sampling: https://istio.io/latest/docs/tasks/observability/distributed-tracing/sampling/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Resource Annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Global Mesh Options / Tracing reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio Distributed Tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio Distributed Tracing FAQ: https://istio.io/latest/about/faq/distributed-tracing/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- B3 propagation specification: https://github.com/openzipkin/b3-propagation
- OpenTelemetry Sampling concepts: https://opentelemetry.io/docs/concepts/sampling/
- OpenTelemetry tail sampling sample configuration: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/

## Issues Found
- Corrected the sampling volume table to describe sampled requests/traces rather than spans. A sampled trace can contain multiple spans, so the original span counts were misleading.
- Added that pod annotation changes require a rollout or restart to take effect, because `proxy.istio.io/config` is per-pod proxy configuration.
- Corrected the precedence order. Current Istio documentation states random percentage sampler precedence is Telemetry API > Pod Annotation > MeshConfig, with Telemetry hierarchy applying workload, namespace, then root namespace resources.
- Replaced an unsupported fixed Jaeger/Elasticsearch collector capacity claim with a measurement-based recommendation, since official documentation does not define a universal spans-per-second capacity.
- Corrected the cost example from about $150/day to about $173/day at $0.20 per million spans for 10K RPS at 100% sampling, before multi-span trace expansion.

## Review Notes
The Telemetry API snippets, MeshConfig sampling field, `proxy.istio.io/config` annotation, B3 force-tracing headers, and OpenTelemetry tail sampling discussion are consistent with the consulted documentation. `kubectl` and `istioctl` were not installed in the local environment, so command verification was performed against official command and Istio documentation rather than local help output.
