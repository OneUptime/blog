# Validation Summary: How to Trace Kubernetes Admission Webhooks with OpenTelemetry

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Kubernetes admission webhooks
- ValidatingWebhookConfiguration
- Kubernetes Deployment manifests
- OpenTelemetry Go SDK and HTTP instrumentation
- OpenTelemetry Python SDK and Flask instrumentation
- OTLP/gRPC trace exporting
- OpenTelemetry metrics

## Sources Consulted
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/admissionregistration/validating-webhook-configuration-v1/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go getting started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go OTLP trace gRPC exporter package docs: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry Go semantic conventions package docs: https://pkg.go.dev/go.opentelemetry.io/otel/semconv/v1.37.0
- OpenTelemetry Go metric package docs: https://pkg.go.dev/go.opentelemetry.io/otel/metric

## Issues Found
- Updated the Go semantic conventions import from `go.opentelemetry.io/otel/semconv/v1.21.0` to `go.opentelemetry.io/otel/semconv/v1.37.0` and replaced `semconv.DeploymentEnvironment` with `semconv.DeploymentEnvironmentName`, matching the current semantic convention attribute name.
- Added the missing `context` import to the Go validation handler snippet because `validatePolicy` uses `context.Context`.
- Removed `trace.WithSpanKind(trace.SpanKindServer)` from the manual `validate-resource` span because `otelhttp.NewHandler` already creates the HTTP server span; the validation span should remain a normal internal child span.
- Added a nil check for `review.Request` before dereferencing AdmissionReview fields, preventing a panic on malformed AdmissionReview input.
- Added an `admission.timeout_seconds` span attribute to match the timeout-awareness guidance in the post.
- Replaced the incorrect Python `BatchSpanExporter` usage with `BatchSpanProcessor`, which is the current OpenTelemetry Python SDK processor used with `OTLPSpanExporter`.
- Updated Python span status handling to use `Status(StatusCode.ERROR, ...)`, matching the documented OpenTelemetry Python pattern.
- Removed an unused Python `json` import.
- Added the missing `log` import to the Go metrics snippet because the code calls `log.Fatalf`.
- Corrected the high-latency debugging text so it distinguishes span duration from the `admission.request.duration` metric histogram.
- Added the required `spec.selector.matchLabels` and matching `spec.template.metadata.labels` fields to the Kubernetes `apps/v1` Deployment example.
- Softened the unverified microsecond-level instrumentation overhead claim because actual overhead depends on SDK configuration, sampling, batching, exporter behavior, and runtime conditions.

## Review Notes
Go is not installed in this environment, so I could not run `go test`, `go vet`, or `gofmt` locally. Python code fences were parsed with Python 3.12 successfully. The examples remain illustrative and omit full production concerns such as TLS CA bundle configuration, metric provider/exporter setup, input validation details, and collector configuration contents.
