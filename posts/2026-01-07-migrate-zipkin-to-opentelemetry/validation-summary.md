# Validation Summary: How to Migrate from Zipkin to OpenTelemetry

## Status
validated

## Post Type
Technical migration guide / tutorial

## Technologies Covered
- OpenTelemetry Collector
- Zipkin
- OTLP
- B3 propagation
- W3C Trace Context and Baggage
- Kubernetes
- Java / Spring Boot
- Node.js / JavaScript
- Python / Flask
- Grafana Tempo, Jaeger, OneUptime, and generic OTLP backends

## Sources Consulted
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Zipkin exporter docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/zipkinexporter/README.md
- OpenTelemetry Collector health check extension docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector OTTL context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry Java SDK configuration docs: https://opentelemetry.io/docs/languages/java/configuration/
- OpenTelemetry Spring Boot starter docs: https://opentelemetry.io/docs/zero-code/java/spring-boot-starter/
- Maven Central metadata for OpenTelemetry Java artifacts: https://search.maven.org/
- OpenTelemetry JavaScript Node.js docs: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript resource docs: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JS SDK API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- npm package metadata for OpenTelemetry JavaScript packages: https://www.npmjs.com/
- OpenTelemetry Python propagation docs: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python API docs: https://opentelemetry-python.readthedocs.io/
- PyPI metadata for OpenTelemetry Python packages: https://pypi.org/
- OneUptime OpenTelemetry docs: https://oneuptime.com/docs/en/telemetry/open-telemetry
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- B3 propagation specification: https://github.com/openzipkin/b3-propagation

## Issues Found
- The Kubernetes probes used port 13133, but the first collector configuration did not enable the `health_check` extension. Added the extension and registered it under `service.extensions`.
- The collector deployment used the outdated `otel/opentelemetry-collector-contrib:0.96.0` image. Updated it to `0.154.0`, the current OpenTelemetry Collector release checked during review.
- The deployment did not list the health check container port even though probes referenced it. Added container port 13133 for clarity.
- Java OpenTelemetry dependencies were pinned to older versions. Updated the Spring Boot starter to `2.16.0` and OpenTelemetry Java artifacts to `1.51.0`.
- The Spring Boot `otel.propagators` example used YAML list syntax, while OpenTelemetry Java autoconfigure documents `otel.propagators` as a comma-separated property. Changed it to `tracecontext,baggage,b3multi`.
- The Spring resource attribute example used the older `deployment.environment` semantic attribute. Updated it to `deployment.environment.name`.
- The manual Java composite propagator comments referenced W3C baggage, but the code did not include the baggage propagator. Added `W3CBaggagePropagator`.
- The Node.js example used `new Resource(...)` from `@opentelemetry/resources`, which is not exported by the current package. Replaced it with `resourceFromAttributes(...)` and current semantic convention constants.
- Python OpenTelemetry package pins were outdated. Updated stable packages to `1.42.1` and instrumentation packages to `0.63b1`.
- The Python resource example used the older `deployment.environment` semantic attribute. Updated it to `deployment.environment.name`.
- The Collector transform example used `TraceID()` as a no-argument accessor, which is invalid OTTL usage. Replaced it with `span.trace_id.string`.
- The OneUptime exporter reference used an undocumented `otlp.oneuptime.com:4317` endpoint and bearer authorization header. Replaced it with the documented `otlphttp` endpoint, JSON encoding, and `x-oneuptime-token` header.

## Review Notes
- YAML snippets were parsed locally.
- Current Node.js OpenTelemetry imports were tested locally with npm-installed packages.
- Current Python OpenTelemetry imports were tested locally with pip-installed packages.
- Java snippets were not compiled locally because Java and Maven are not installed in the review environment; Java changes were verified against official OpenTelemetry docs and Maven Central metadata.
