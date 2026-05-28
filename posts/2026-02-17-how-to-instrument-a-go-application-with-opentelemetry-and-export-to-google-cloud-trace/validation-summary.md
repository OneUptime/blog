# Validation Summary: How to Instrument a Go Application with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- OpenTelemetry Go API and SDK
- OpenTelemetry HTTP instrumentation for Go
- Google Cloud Trace
- Google Cloud Application Default Credentials
- Google Cloud IAM

## Sources Consulted
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Go sampling documentation: https://opentelemetry.io/docs/languages/go/sampling/
- OpenTelemetry Go exporters documentation: https://opentelemetry.io/docs/languages/go/exporters/
- OpenTelemetry Go SDK trace package reference: https://pkg.go.dev/go.opentelemetry.io/otel/sdk/trace
- OpenTelemetry Go otelhttp package reference: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
- Google Cloud OpenTelemetry Operations Go trace exporter package reference: https://pkg.go.dev/github.com/GoogleCloudPlatform/opentelemetry-operations-go/exporter/trace
- Google Cloud Trace instrumentation documentation: https://docs.cloud.google.com/trace/docs/setup
- Google Cloud Trace IAM roles documentation: https://cloud.google.com/iam/docs/roles-permissions/cloudtrace
- Google Cloud CLI ADC documentation: https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login

## Issues Found
- Removed `go get go.opentelemetry.io/otel/exporters/otlp/otlptrace` from the dependency installation commands. The tutorial uses the direct Google Cloud Trace exporter, not the OTLP trace exporter, so that package is unnecessary for the shown code.
- Corrected the Cloud Trace hierarchy description. The code creates an HTTP server span through `otelhttp.NewHandler`, then a manual `processRequest` span, then a `fetchData` child span, so `fetchData` is nested under `processRequest` rather than directly under the HTTP handler span.

## Review Notes
- Google Cloud's current documentation recommends an OpenTelemetry Collector and OTLP export path when the environment supports it, but the direct Google Cloud Trace exporter used in this post remains documented and valid.
- I could not run `go build` in this environment because the `go` binary is not installed. API and command validation was performed against official package and product documentation.
