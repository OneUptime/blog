# Validation Summary: How to Set Up End-to-End Tracing Across Microservices with Istio

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Istio service mesh
- Istio Telemetry API
- OpenTelemetry Collector and OTLP
- Jaeger
- Kubernetes and kubectl
- Node.js, Express, and axios
- Go net/http
- Distributed tracing header propagation

## Sources Consulted
- Istio distributed tracing overview: https://istio.io/latest/docs/tasks/observability/distributed-tracing/overview/
- Istio OpenTelemetry tracing task: https://istio.io/latest/docs/tasks/observability/distributed-tracing/opentelemetry/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio MeshConfig extension provider reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger APIs / OTLP support documentation: https://www.jaegertracing.io/docs/1.55/apis/
- Kubernetes kubectl create namespace reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/
- Kubernetes kubectl create deployment reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Express middleware guide: https://expressjs.com/en/guide/writing-middleware.html
- Axios request API documentation: https://github.com/axios/axios
- Go Effective Go guidance on unused imports: https://go.dev/doc/effective_go
- Go net/http package documentation: https://pkg.go.dev/net/http

## Issues Found
- The Go payment service imported `io` without using it. Go treats unused imports as compile errors, so the import was removed.
- The Go payment service ignored the error returned by `http.NewRequest`. The example now checks the error before propagating headers and calling the fraud service.
- The trace-generation and troubleshooting commands used `deploy/sleep`, but the post never created that deployment. Added a `kubectl create deployment sleep ...` command in the service deployment step.
- The `kubectl exec deploy/sleep` commands did not specify the `ecommerce` namespace even though the curl pod is created there. Added `-n ecommerce`.
- The troubleshooting curl called `/api/orders` without using `POST` or a request body, while the Node.js example only defines `POST /api/orders`. Updated the troubleshooting command to use `-X POST`, `Content-Type`, and the same JSON body shape as the order creation example.

## Review Notes
- The Istio `extensionProviders` OpenTelemetry configuration, `Telemetry` resources, `randomSamplingPercentage`, and `customTags` examples match the current Istio API.
- The OpenTelemetry Collector OTLP receiver/exporter shape is valid, and the Jaeger all-in-one image can receive OTLP on port 4317 for trace data.
- `kubectl` and `go` were not installed in the local environment, so command execution and Go compilation could not be verified locally. The commands and Go corrections were checked against official documentation instead.
