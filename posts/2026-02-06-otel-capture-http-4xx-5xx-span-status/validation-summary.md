# Validation Summary: How to Configure OpenTelemetry to Capture HTTP 4xx vs 5xx Errors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing and HTTP semantic conventions
- OpenTelemetry JavaScript HTTP and Express instrumentation
- OpenTelemetry Python Flask instrumentation
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector span metrics connector
- Prometheus / PromQL

## Sources Consulted
- OpenTelemetry HTTP span semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry trace API status semantics: https://opentelemetry.io/docs/specs/otel/trace/api
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/blog/2023/http-conventions-declared-stable/
- OpenTelemetry JavaScript HTTP instrumentation docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_instrumentation-http.html
- OpenTelemetry Python Flask instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- OpenTelemetry Python trace API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Collector transform processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector transforming telemetry docs: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector span metrics connector docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md

## Issues Found
- The post claimed most OpenTelemetry HTTP instrumentations mark all >=400 HTTP responses as span errors. Current OpenTelemetry HTTP semantic conventions require server 4xx statuses to remain unset and client 4xx statuses to be treated as errors, so I narrowed the claim to older instrumentation, custom instrumentation, or backend span-metrics pipelines.
- The examples used the deprecated `http.status_code` attribute. Current stable HTTP semantic conventions use `http.response.status_code`, so I updated JavaScript, Python, and Collector examples.
- The JavaScript and Python examples set span status descriptions derived only from HTTP status codes. OpenTelemetry recommends not setting a status description when the reason can be inferred from `http.response.status_code`, so I removed those descriptions.
- The Flask response hook treated the hook's second argument as an integer. The official Flask instrumentation docs pass the response status as a string, so I updated the example to parse the numeric code and added a recording-span guard.
- The Python examples imported `opentelemetry.trace` and referenced `trace.StatusCode`. I changed them to import `StatusCode` directly from `opentelemetry.trace`, matching current Python API examples.
- The dashboard section implied custom span attributes would automatically appear as span-metrics labels. The span metrics connector requires dimensions to be configured for extra attributes, so I added that caveat and updated the metric name to the current span metrics connector naming style.
- The Collector transform example used older grouped syntax, unprefixed paths, a numeric status value, and a string boolean attribute. I updated it to current OTTL syntax using `span.status.code`, `STATUS_CODE_OK`, `span.attributes[...]`, and boolean `true`.

## Review Notes
The post remains intentionally focused on custom status normalization. In production, teams should verify the semantic convention mode emitted by each language instrumentation and configure span metrics connector dimensions consistently before relying on the PromQL examples.
