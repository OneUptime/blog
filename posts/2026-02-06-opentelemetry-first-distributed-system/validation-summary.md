# Validation Summary: How to Set Up OpenTelemetry for Your First Distributed System

## Status
validated

## Post Type
Tutorial / hands-on guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry JavaScript SDK
- Node.js
- Express
- Axios
- PostgreSQL / node-postgres
- Redis
- RabbitMQ / amqplib
- Jaeger
- Docker Compose
- W3C trace context propagation

## Sources Consulted
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector debug exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/tree/v0.153.0/exporter/debugexporter
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript instrumentation libraries documentation: https://opentelemetry.io/docs/languages/js/libraries/
- OpenTelemetry JavaScript propagation documentation: https://opentelemetry.io/docs/languages/js/propagation/
- OpenTelemetry JavaScript semantic-conventions package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry JavaScript resources package documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose up command documentation: https://docs.docker.com/reference/cli/docker/compose/up/
- Referenced OneUptime blog URL checked: https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view

## Issues Found
- The Collector configuration used the deprecated/removed `logging` exporter with `loglevel: debug`. Changed it to the current `debug` exporter with `verbosity: detailed` and updated the traces pipeline to export to `debug`.
- The Docker Compose example used the obsolete top-level `version: '3.8'` field. Removed it to align with the current Compose Specification.
- The Docker Compose example exposed host port `4317` from both Jaeger and the OpenTelemetry Collector, which would cause a port binding conflict. Removed Jaeger's host `4317` mapping because the Collector can reach Jaeger on the internal Compose network at `jaeger:4317`.
- The startup command used the legacy `docker-compose` command spelling. Updated it to `docker compose up -d`, the current Docker Compose v2 command form.
- The Node.js snippets used deprecated OpenTelemetry JavaScript semantic-convention namespace exports and `new Resource(...)`. Updated them to `resourceFromAttributes(...)` with `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`.
- The auth service used `tracer.startSpan(...)` for a manual span without making that span active. Updated it to `tracer.startActiveSpan(...)`, matching the current OpenTelemetry JavaScript guidance for most manual spans.
- The notification service claimed to inject trace context into RabbitMQ message metadata, but the code only created an empty carrier and called `spanContext()` without injecting anything. Updated it to import `propagation` and call `propagation.inject(context.active(), carrier)` before passing the carrier as message headers.
- The notification service used numeric span status codes. Updated it to use `SpanStatusCode.OK` and `SpanStatusCode.ERROR` from `@opentelemetry/api`.

## Review Notes
- The examples assume the Node.js services run on the host machine, because the OTLP exporter URLs and service URLs use `localhost`. If these services are later containerized, the hostnames would need to be adjusted for the Docker network.
- The tutorial does not include runnable PostgreSQL, Redis, or RabbitMQ containers, so the examples remain illustrative unless those dependencies are started separately.
