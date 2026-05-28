# Validation Summary: How to Use Middleware for Cloud Trace Propagation in a Go HTTP Service

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- net/http
- OpenTelemetry
- Google Cloud Trace
- Cloud Run
- Distributed tracing

## Sources Consulted
- Google Cloud Trace setup for Go: https://cloud.google.com/trace/docs/setup/go-ot
- Google Cloud Trace context documentation: https://cloud.google.com/trace/docs/trace-context
- Google Cloud Trace and Cloud Run tracing documentation: https://cloud.google.com/run/docs/trace
- Google Cloud OpenTelemetry operations Go exporter package: https://pkg.go.dev/github.com/GoogleCloudPlatform/opentelemetry-operations-go/exporter/trace
- Google Cloud OpenTelemetry operations Go propagator package: https://pkg.go.dev/github.com/GoogleCloudPlatform/opentelemetry-operations-go/propagator
- OpenTelemetry Go propagation package: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Go trace package: https://pkg.go.dev/go.opentelemetry.io/otel/trace
- OpenTelemetry Go HTTP instrumentation package: https://pkg.go.dev/go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp

## Issues Found
- The post said Cloud Run automatically injects only `X-Cloud-Trace-Context`. Updated the explanation to mention W3C `traceparent` as the primary incoming trace context header and `X-Cloud-Trace-Context` as a Google Cloud legacy format that services may still need to support.
- The dependency list included the OTLP gRPC exporter even though the code uses the Google Cloud Trace exporter directly. Removed the unused OTLP exporter dependency and added the Google Cloud propagator dependency.
- The tracer setup claimed to use both W3C and Google Cloud Trace propagation but only configured W3C Trace Context and baggage. Added `github.com/GoogleCloudPlatform/opentelemetry-operations-go/propagator` and configured `CloudTraceFormatPropagator` in the composite propagator.
- The middleware snippet referenced `propagation.HeaderCarrier` without importing the propagation package and also imported `strings` without using it. Fixed the imports.
- The middleware manually parsed `X-Cloud-Trace-Context` even though the configured propagator should handle incoming headers. Removed the redundant call and left the parser as a standalone fallback example.
- The manual `X-Cloud-Trace-Context` parser treated the Google Cloud span ID as a padded hex string, but the header span ID is decimal. Updated the parser to parse the decimal span ID with `strconv.ParseUint` and convert it to a 16-character hex string for OpenTelemetry.
- The manual parser always marked traces as sampled. Updated it to set `trace.FlagsSampled` only when the header options include `o=1`.
- The manual parser snippet imported `encoding/hex` without using it and omitted required `fmt` and `net/http` imports. Fixed the imports.
- The outgoing HTTP call snippet used `trace.WithAttributes` and `propagation.HeaderCarrier` without importing the corresponding packages. Fixed the imports.
- The Mermaid diagram only showed `X-Cloud-Trace-Context`; updated it to show both `traceparent` and `X-Cloud-Trace-Context`.

## Review Notes
I could not run local Go compilation because the `go` command is not installed in this environment. The review was performed against official Google Cloud and OpenTelemetry documentation. The post still uses custom middleware for educational purposes; in production, `otelhttp.NewHandler` can often replace some of the hand-written server-side middleware.
