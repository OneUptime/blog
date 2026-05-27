# Validation Summary: How to Set Up Cross-Service Distributed Tracing in Cloud Trace

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Trace
- Google Kubernetes Engine
- Workload Identity Federation for GKE
- OpenTelemetry
- Node.js and Express
- Python and Flask
- Go net/http
- Kubernetes Deployments and Services

## Sources Consulted
- Google Cloud Trace setup documentation: https://docs.cloud.google.com/trace/docs/setup
- Google Cloud Trace IAM roles: https://docs.cloud.google.com/trace/docs/iam
- GKE Workload Identity Federation guide: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- OpenTelemetry JavaScript resources API: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- Google Cloud OpenTelemetry Node.js exporter package documentation: https://www.npmjs.com/package/@google-cloud/opentelemetry-cloud-trace-exporter
- Google Cloud OpenTelemetry Python Cloud Trace exporter documentation: https://google-cloud-opentelemetry.readthedocs.io/en/stable/cloud_trace/cloud_trace.html
- Google Cloud OpenTelemetry Go Cloud Trace exporter documentation: https://pkg.go.dev/github.com/GoogleCloudPlatform/opentelemetry-operations-go/exporter/trace
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/

## Issues Found
- The Node.js tracing snippet used `new Resource(...)` from `@opentelemetry/resources`. Current OpenTelemetry JavaScript documentation shows `resourceFromAttributes(...)`, so the snippet was updated to use that API.
- The Node.js Cloud Trace exporter was initialized without a `resourceFilter`. The Google Cloud exporter documentation notes that resource attributes that do not map to a monitored resource are ignored by default, so the snippet now includes a filter for the service and deployment attributes used in the example.
- The Go inventory service claimed to initialize OpenTelemetry but only wrapped the HTTP handler. It did not configure a tracer provider, Cloud Trace exporter, batch span processor, sampler, or W3C propagator, so spans would not be exported to Cloud Trace and incoming trace context might not be extracted. The snippet now initializes the Google Cloud Trace exporter, sets a tracer provider with ParentBased sampling, configures W3C trace context propagation, and shuts down cleanly.
- The troubleshooting section said a downstream service with a different non-ParentBased sampler might create new traces instead of continuing existing ones. Sampling affects whether spans are recorded or dropped, not whether a valid extracted parent context is used, so the wording was corrected.
- The timestamp troubleshooting note said out-of-range span timestamps might not be associated correctly. Span association is based on trace and parent span context; the wording now says incorrect timestamps can make the waterfall view confusing.

## Review Notes
- The GKE Workload Identity Federation commands are consistent with Google Cloud's documented service-account impersonation flow, but existing Standard node pools may also need `--workload-metadata=GKE_METADATA` enabled.
- Google Cloud now recommends collector-based OpenTelemetry export when the environment supports it, while the post intentionally uses in-process Cloud Trace exporters. This remains a valid pattern for direct export.
- Local Node.js syntax parsing passed. Python snippet parsing passed. Go syntax could not be checked locally because `gofmt`/Go tooling is not installed in this environment.
