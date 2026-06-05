# Validation Summary: How to Resolve Duplicate Traces Caused by Misconfigured Context Propagation

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- OpenTelemetry tracing and context propagation
- OpenTelemetry Python API and SDK
- OpenTelemetry Python Flask instrumentation
- W3C Trace Context
- Zipkin B3 propagation
- Nginx reverse proxy configuration
- Envoy tracing configuration
- OpenTelemetry Collector pipelines
- curl and jq

## Sources Consulted
- OpenTelemetry Environment Variable Specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Propagators API specification: https://opentelemetry.io/docs/specs/otel/context/api-propagators/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Python Flask instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/flask/flask.html
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Envoy OpenTelemetry tracer API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/trace/v3/opentelemetry.proto.html
- Envoy route components API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- OpenTelemetry Collector architecture documentation: https://opentelemetry.io/docs/collector/architecture/

## Issues Found
- The Python composite propagator example imported `TraceContextTextMapPropagator` from the wrong module. Changed it to `opentelemetry.trace.propagation.tracecontext`, which is the current OpenTelemetry Python import path.
- The Flask auto-instrumentation example used `len(users)` before `users` was defined. Changed the example to call `fetch_users()`, set the `user.count` attribute, and then return the fetched users.
- The Nginx example incorrectly claimed that using `proxy_set_header` without listing trace headers drops all other request headers. Nginx forwards request headers by default with `proxy_pass_request_headers on`; the corrected example now shows the actual problematic setting, `proxy_pass_request_headers off`, and the corresponding fix.
- The Envoy example placed `request_headers_to_add` under `route`, where it is not a valid `RouteAction` field. Changed the snippet to use route-level `request_headers_to_remove: []` and clarified that trace context headers should not be removed by route/header mutations.
- The multiple `TracerProvider` section said a second `trace.set_tracer_provider()` call replaces the global provider in Python. OpenTelemetry Python only allows setting the global provider once and logs a warning on later attempts, so the explanation and example were corrected.
- The conclusion was updated to describe inconsistent `TracerProvider` initialization rather than directly claiming that multiple providers always create duplicate traces.

## Review Notes
The post is technically relevant and code-heavy. The Collector duplicate-pipeline explanation is consistent with the Collector architecture: one receiver can fan out the same data to multiple pipelines, and exporters can send copies onward. The Envoy OpenTelemetry tracer extension is currently marked work-in-progress in Envoy documentation, so production users should confirm whether their Envoy build and deployment policy support it.
