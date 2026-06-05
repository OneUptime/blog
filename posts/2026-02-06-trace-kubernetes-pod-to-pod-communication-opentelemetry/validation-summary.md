# Validation Summary: How to Trace Kubernetes Pod-to-Pod Communication with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Kubernetes attributes processor
- OpenTelemetry Protocol (OTLP)
- Kubernetes DaemonSet, host ports, downward API, and pod metadata
- OpenTelemetry JavaScript SDK and auto-instrumentation
- OpenTelemetry Python SDK and auto-instrumentation
- W3C Trace Context propagation

## Sources Consulted
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python zero-code instrumentation documentation: https://opentelemetry.io/docs/zero-code/python/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- Kubernetes downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes dependent environment variables documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The post called the `k8sattributes` processor a resource detection processor. Changed the wording to Kubernetes attributes processor because it is a distinct collector processor.
- The collector `pod_association` configuration only matched `k8s.pod.ip`, which would fail when that resource attribute was missing. Added `k8s.pod.uid` and connection-based fallbacks matching the documented processor pattern.
- The DaemonSet text said the collector used the host network, but the manifest used `hostPort` and did not set `hostNetwork: true`. Updated the text to describe host ports instead.
- The DaemonSet used `otel/opentelemetry-collector-contrib:0.96.0`, which is outdated. Updated it to `0.153.0`, the current OpenTelemetry Collector Contrib release checked during review.
- The Node.js example used `new Resource(...)`, but current OpenTelemetry JavaScript documentation uses `resourceFromAttributes`. Updated the import and resource creation.
- The Node.js OTLP gRPC exporter used a `grpc://` URL. Updated it to `http://...:4317`, which matches the OTLP exporter specification for insecure gRPC endpoints.
- The Python package comments did not include the current zero-code instrumentation setup with `opentelemetry-distro` and `opentelemetry-bootstrap`. Updated the install comments.
- The manual message consumer comment said the span was linked to the producing trace, but the code creates a parent-child relationship through extracted context. Updated the comment to say parented.
- The Kubernetes deployment snippet referenced `POD_NAME` and `POD_NAMESPACE` in `OTEL_RESOURCE_ATTRIBUTES` before defining them. Reordered the environment variables and added `POD_IP` so Kubernetes expands the references correctly and the collector can associate spans by pod IP.
- The troubleshooting curl command could imply that a GET to `/v1/traces` uploads trace data. Clarified that it is only a reachability check for the OTLP HTTP port.

## Review Notes
The tutorial is technically relevant and now validates as a current implementation guide. In a future expansion, the post could include the full ServiceAccount, ClusterRole, and ClusterRoleBinding manifest required by the `k8sattributes` processor, but the current text explicitly notes that those RBAC rules are omitted for brevity.
