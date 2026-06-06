# Validation Summary: How to Compare OpenTelemetry SDK vs Zero-Code Instrumentation Approaches

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry SDK
- OpenTelemetry zero-code instrumentation
- OpenTelemetry Operator auto-instrumentation
- OpenTelemetry eBPF Instrumentation (OBI)
- Grafana Beyla
- Kubernetes DaemonSets and pod annotations
- Istio service mesh tracing
- Python OpenTelemetry tracing and metrics APIs
- eBPF-based observability

## Sources Consulted
- OpenTelemetry eBPF Instrumentation documentation: https://opentelemetry.io/docs/zero-code/obi/
- OpenTelemetry zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/
- OpenTelemetry zero-code concepts: https://opentelemetry.io/docs/concepts/instrumentation/zero-code/
- OpenTelemetry Operator auto-instrumentation injection documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- Istio OpenTelemetry tracing documentation: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Grafana Beyla Kubernetes deployment documentation: https://grafana.com/docs/beyla/latest/setup/kubernetes/
- Grafana Beyla distributed traces documentation: https://grafana.com/docs/beyla/latest/distributed-traces/

## Issues Found
- The Beyla DaemonSet example claimed it instruments all pods on the node while using `BEYLA_OPEN_PORT`, which Grafana documents as unsuitable for DaemonSet process selection when targeting pod-internal ports. Updated the example to describe matching processes and use `BEYLA_AUTO_TARGET_EXE`.
- The Beyla DaemonSet manifest omitted `spec.template.metadata.labels` matching the DaemonSet selector, which would make the Kubernetes object invalid. Added the matching pod template labels.
- The eBPF language support claim and comparison table said eBPF works with all languages. Updated the wording to describe broad, tool-dependent Linux support for supported protocols.
- The eBPF limitations said application-level context propagation was categorically unavailable. Updated this to note that full application-level context propagation is not available for every protocol, because modern tools such as Beyla and OBI support some automatic context propagation with limitations.
- The Istio tracing example mixed legacy `openCensusAgent` configuration with the current OpenTelemetry extension provider configuration. Replaced it with the current `extensionProviders` plus `telemetry.istio.io/v1` `Telemetry` resource pattern and `randomSamplingPercentage`.
- The service mesh section implied proxies provide complete automatic context propagation by themselves. Updated it to match Istio guidance that applications must forward trace headers for proxy-generated spans to be joined into a single trace.
- The auto-instrumentation wording said the Operator always injects a language-specific agent into the container. Updated it to say language-specific instrumentation is injected into the pod, which better covers the Operator's supported mechanisms.
- The comparison table listed OTel auto-instrumentation support as only Java, Python, .NET, and Node.js. Added Go to align with current OpenTelemetry Kubernetes Operator documentation.
- The comparison table said all languages have OpenTelemetry SDKs. Changed this to "Most major languages with SDKs" to avoid overclaiming.

## Review Notes
The Python OpenTelemetry sample uses current tracing and metrics APIs for illustrative manual instrumentation, but it intentionally omits provider/exporter setup. The post already notes that setup code is omitted for brevity.
