# Validation Summary: How to Build Custom Span Processors for Kubernetes Metadata Enrichment in Traces

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OpenTelemetry Go SDK
- OpenTelemetry span processors
- OpenTelemetry Kubernetes semantic conventions
- Kubernetes API and client-go
- Kubernetes RBAC
- Kubernetes Downward API environment variables
- OTLP trace exporter over gRPC

## Sources Consulted
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- OpenTelemetry Go SDK trace package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Kubernetes resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/k8s/
- OpenTelemetry OTLP trace gRPC exporter package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes client-go in-cluster configuration example: https://github.com/kubernetes/client-go/blob/master/examples/in-cluster-client-configuration/main.go

## Issues Found
- The description said the processor enriched traces with resource quotas, but the code reads container resource requests and limits from the Pod spec. Updated the description to say resource limits.
- The span processor explanation implied that `OnEnd` can mutate completed spans in Go. OpenTelemetry's SDK specification says ended spans must not be modified, and the Go SDK exposes `OnEnd` as `ReadOnlySpan`. Updated the explanation to reserve mutation for `OnStart` and mention sampling or exporter-aware processing for filtering.
- Several Kubernetes attribute keys did not match OpenTelemetry Kubernetes semantic conventions. Updated namespace, pod label, and node label attributes to use `k8s.namespace.name`, `k8s.pod.label.<key>`, and `k8s.node.label.<key>` forms.
- The `main.go` snippet referenced the `processor` package without importing it. Added a placeholder module import.
- The `main.go` snippet logged Kubernetes processor creation failures but still registered a possibly nil processor. Updated tracer provider option construction so the Kubernetes processor is registered only when it was created successfully.
- The RBAC example placed `nodes` in a namespaced `Role`, but Kubernetes nodes are cluster-scoped and require a `ClusterRole` bound with a `ClusterRoleBinding` to be effective. Split node permissions into a separate `ClusterRole` and `ClusterRoleBinding`.
- The Deployment placed cost annotations on the Deployment object metadata, while the processor reads pod annotations. Moved those annotations to the Pod template metadata so they appear on created Pods.
- The Role granted `deployments` access even though the code only reads Pods, Nodes, and ReplicaSets. Removed the unused Deployment permission from the example.

## Review Notes
The remaining examples are illustrative and still use custom span attributes for cost and resource request/limit fields. In a production OpenTelemetry setup, Kubernetes identity is often modeled as resource attributes, and the OpenTelemetry Collector's Kubernetes attributes processor can provide this enrichment outside the application process.
