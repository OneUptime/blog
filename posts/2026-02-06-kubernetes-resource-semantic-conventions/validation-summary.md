# Validation Summary: How to Apply Kubernetes Resource Semantic Conventions

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry semantic conventions
- Kubernetes resource attributes
- Kubernetes Downward API
- OpenTelemetry Python SDK
- OpenTelemetry Operator for Kubernetes
- OpenTelemetry Collector `k8sattributes` processor
- OTLP exporter configuration

## Sources Consulted
- OpenTelemetry Kubernetes resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/k8s/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Python SDK resource documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Operator README and auto-instrumentation documentation: https://github.com/open-telemetry/opentelemetry-operator/blob/main/README.md
- OpenTelemetry Operator Instrumentation CRD: https://github.com/open-telemetry/opentelemetry-operator/blob/main/config/crd/bases/opentelemetry.io_instrumentations.yaml
- OpenTelemetry Collector Contrib `k8sattributes` processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/

## Issues Found
- The post described `k8s.cluster.uid` as the cluster UID. OpenTelemetry defines it as a pseudo-ID for the cluster, set to the UID of the `kube-system` namespace. Updated the table description.
- The Collector example matched pods using `k8s.pod.ip`, but the earlier Deployment and Python examples did not set that resource attribute. Added `K8S_POD_IP` from the Downward API using `status.podIP` and added `k8s.pod.ip` to the Python resource.
- The Python example configured only a `TracerProvider`, but the text claimed every span, metric, and log produced by the application would carry the resource. Updated the wording to say spans from that tracer provider carry the attributes, and that metric and log providers should be configured with the same resource.
- The Operator section referred to both OpenTelemetryCollector and Instrumentation custom resources, but the snippet only showed an Instrumentation resource. Updated the wording to match the snippet.
- The post said the SDK typically sets `k8s.pod.ip` automatically. OpenTelemetry SDKs do not generally set that Kubernetes attribute by default. Updated the text to explain that the example sets it through the Downward API, while the processor can also fall back to incoming connection IP when `pod_association` is not configured.
- The RBAC best practice said the processor would fail silently. Updated it to state that missing list/watch permissions prevent reliable enrichment and surface Kubernetes API errors in Collector logs.

## Review Notes
The Operator and `k8sattributes` processor APIs are actively maintained, and some Kubernetes semantic convention groups are still marked development or release candidate. The examples are valid against current documentation, but production deployments should pin auto-instrumentation image versions instead of using `latest`.
