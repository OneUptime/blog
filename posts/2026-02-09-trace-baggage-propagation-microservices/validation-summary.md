# Validation Summary: How to Use Trace Baggage Propagation to Pass Request Context Across K8s

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry baggage
- OpenTelemetry context propagation
- Kubernetes microservices
- Go OpenTelemetry API
- Python OpenTelemetry API and SDK
- Java OpenTelemetry API
- Grafana Tempo TraceQL

## Sources Consulted
- OpenTelemetry Baggage concepts: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry Context Propagation concepts: https://opentelemetry.io/docs/concepts/context-propagation/
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry Go baggage package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/baggage
- OpenTelemetry Go propagation package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/propagation
- OpenTelemetry Python baggage API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python baggage propagation documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.propagation.html
- OpenTelemetry Python propagation documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/propagate.html
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Java configuration documentation: https://opentelemetry.io/docs/languages/java/configuration/
- W3C Baggage specification: https://www.w3.org/TR/baggage/
- Prometheus data model documentation: https://prometheus.io/docs/concepts/
- Grafana Tempo TraceQL documentation: https://grafana.com/docs/tempo/latest/traceql/
- Grafana Tempo TraceQL query construction documentation: https://grafana.com/docs/enterprise-traces/latest/traceql/construct-traceql-queries/

## Issues Found
- The post said baggage is visible in spans. OpenTelemetry documents baggage as separate from span attributes, so this was changed to say baggage can be copied to spans for correlation.
- The post said baggage propagates automatically. This was narrowed to propagation when a baggage propagator is configured, matching OpenTelemetry propagation behavior.
- The Go example imported `trace` without using it, omitted the required `attribute` import, used an undefined `logger`, and closed the response body without checking the HTTP request error. These were fixed with the correct import, standard `log.Printf`, and basic error handling.
- The Python example used outdated propagator import paths. These were updated to `opentelemetry.trace.propagation.tracecontext.TraceContextTextMapPropagator` and `opentelemetry.baggage.propagation.W3CBaggagePropagator`.
- The Python example could set a `None` baggage value from a missing `X-User-ID` header. This was changed to default to an empty string.
- The Java example was missing required imports, used a possibly null baggage value, had an incomplete `HttpURLConnection` assignment, and referenced `openTelemetry` in the backend without defining it. These were corrected while preserving the example structure.
- The Java section did not state that the `OpenTelemetry` instance must include W3C Trace Context and W3C Baggage propagators. A short note was added.
- The monitoring section used PromQL for raw trace queries and included an invalid dotted label selector. This was replaced with Grafana Tempo TraceQL examples for span attributes copied from baggage.

## Review Notes
The remaining examples are illustrative and still omit application-specific setup such as tracer provider shutdown, HTTP framework integration, logger/metrics initialization in smaller snippets, and production-grade error handling. The core baggage APIs and propagation concepts are now technically accurate.
