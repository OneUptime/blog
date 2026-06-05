# Validation Summary: How to Configure OpenTelemetry for Google Cloud Functions (2nd Gen)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry
- Google Cloud Functions 2nd gen / Cloud Run functions
- Google Cloud Run
- Google Cloud Trace
- Python Functions Framework and Flask instrumentation
- Node.js Functions Framework, Express instrumentation, and OpenTelemetry JS SDK
- Go Functions Framework and OpenTelemetry Go SDK
- `gcloud functions deploy`

## Sources Consulted
- Google Cloud Functions version comparison: https://cloud.google.com/functions/docs/concepts/version-comparison
- Cloud Run container runtime contract: https://docs.cloud.google.com/run/docs/container-contract
- `gcloud functions deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Functions Framework for Python: https://github.com/GoogleCloudPlatform/functions-framework-python
- Functions Framework for Node.js: https://github.com/GoogleCloudPlatform/functions-framework-nodejs
- Functions Framework for Go: https://github.com/GoogleCloudPlatform/functions-framework-go
- OpenTelemetry Python instrumentation and exporters docs: https://opentelemetry.io/docs/languages/python/instrumentation/ and https://opentelemetry.io/docs/languages/python/exporters/
- Google Cloud OpenTelemetry Python exporters and resource detector: https://github.com/GoogleCloudPlatform/opentelemetry-operations-python
- OpenTelemetry JS SDK and resource docs: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/ and https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry GCP resource detector for JavaScript: https://www.npmjs.com/package/@opentelemetry/resource-detector-gcp
- OpenTelemetry Go docs and OTLP gRPC exporter package docs: https://opentelemetry.io/docs/languages/go/ and https://go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry SDK environment configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/

## Issues Found
- The Python requirements pinned `opentelemetry-resourcedetector-gcp==1.7.0`, which is not a published package version. Updated it to the current published alpha version, `1.12.0a0`, and updated the related OpenTelemetry Python pins to current compatible published versions.
- The Python prose named `cloud.project_id` as a detected resource attribute. The current GCP detector uses `cloud.account.id` for the project ID, so the attribute name was corrected.
- The Python OTLP exporter comment implied that the OTLP exporter can export directly to Cloud Trace. Changed the comment to say it exports to a collector or other OTLP endpoint; the Cloud Trace exporter remains covered in the dedicated section.
- The Node.js tracing example used older OpenTelemetry JS APIs: `Resource` is no longer exported as a constructor by `@opentelemetry/resources`, `GcpDetector` is not the current GCP detector export, and `NodeTracerProvider#addSpanProcessor` is not available in the current SDK. Reworked the snippet to use `NodeSDK`, `resourceFromAttributes`, `gcpDetector`, and `spanProcessors`.
- The Node.js handler used `startSpan` without making the custom span active and used the numeric status code `2`. Updated it to `startActiveSpan` and `SpanStatusCode.ERROR` so async work and outbound calls are associated with the active span.
- The Go snippet used `time.Second` and `codes.Error` without importing `time` and `go.opentelemetry.io/otel/codes`. Added the missing imports.
- The Go explanation said `sync.Once` protects against multiple calls to `init`, but Go package `init` functions run once per package initialization. Removed the unnecessary `sync.Once` wrapper and corrected the explanation.
- The deployment command used `deployment.environment`; current OpenTelemetry SDK configuration examples use `deployment.environment.name`. Updated the resource attribute.
- The Cloud Trace exporter example did not mention its package dependency. Added the required `opentelemetry-exporter-gcp-trace==1.12.0` package note.

## Review Notes
- The Node.js snippets were smoke-tested against current npm packages and loaded successfully with the current OpenTelemetry exports.
- Python code blocks were syntax-checked with `ast.parse`.
- Go was not installed in the workspace, so the Go snippet could not be compiled locally. The Go fixes were checked against official OpenTelemetry Go package documentation and visible API requirements.
- The examples still contain placeholder application functions such as `process_user_data` / `processUserData`, which is appropriate for the blog format but means the snippets are not standalone applications without adding business logic.
