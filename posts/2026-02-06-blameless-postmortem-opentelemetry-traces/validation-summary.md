# Validation Summary: How to Set Up Blameless Postmortem Workflows Powered by OpenTelemetry Trace Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- Tail-based sampling
- OTLP
- Jaeger-compatible trace query API
- Python
- YAML
- Incident response and blameless postmortems

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/2.3/apis/

## Issues Found
- The OpenTelemetry Collector configuration referenced an `otlp` receiver in the trace pipeline but did not define it. Added a `receivers.otlp.protocols.grpc` configuration so the snippet is a complete, valid Collector configuration.
- The trace timeline script described a generic trace backend while using Jaeger-style `/api/traces` query parameters and response fields. Clarified that the example targets a Jaeger-compatible trace backend.
- The trace timeline script treated Jaeger span tags as a dictionary and looked for `span["process"]["serviceName"]`. Jaeger JSON responses store span tags as a list of key/value objects and service names under the trace-level `processes` map keyed by `processID`. Added helper-based tag extraction and process lookup.
- The trace timeline script converted timestamps with local timezone defaults. Updated timestamp conversion to produce UTC-aware datetimes from Jaeger's microsecond epoch timestamps.
- The OpenTelemetry Python example used `span.set_status(trace.StatusCode.ERROR, str(e))`, but current OpenTelemetry Python documentation shows setting status with `Status(StatusCode.ERROR)`. Imported `Status` and `StatusCode` and updated the call to `span.set_status(Status(StatusCode.ERROR, str(e)))`.
- The OpenTelemetry Python example manually recorded an exception and re-raised it inside a `start_as_current_span` context. Because the context manager can also record uncaught exceptions and set status on exit, the example now disables those automatic context-manager behaviors while retaining the explicit `record_exception` and `set_status` calls.

## Review Notes
The corrected trace query example is still backend-specific because OpenTelemetry defines telemetry formats and APIs, but trace search APIs vary by backend. The post now states that the example is for Jaeger-compatible APIs.
