# Validation Summary: How to Use the OpenTelemetry Demo App for Integration Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Demo
- OpenTelemetry Collector
- Tail sampling processor
- Docker Compose
- Jaeger
- Grafana
- Prometheus
- flagd and OpenFeature feature flags
- Locust
- Python requests
- Microservices instrumentation across Go, JavaScript, Rust, Ruby, Python, .NET, and TypeScript

## Sources Consulted
- OpenTelemetry Demo Docker deployment docs: https://opentelemetry.io/docs/demo/docker-deployment/
- OpenTelemetry Demo services reference: https://opentelemetry.io/docs/demo/services/
- OpenTelemetry Demo feature flags reference: https://opentelemetry.io/docs/demo/feature-flags/
- OpenTelemetry Demo GitHub repository files: https://github.com/open-telemetry/opentelemetry-demo
- OpenTelemetry Collector tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- Docker Compose CLI reference for `up` and `restart`: https://docs.docker.com/reference/cli/docker/compose/up/ and https://docs.docker.com/reference/cli/docker/compose/restart/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Locust command-line option documentation: https://docs.locust.io/

## Issues Found
- The post used outdated demo service and component names (`otel-col`, `src/otelcollector/`, Redis, `checkoutservice`, `paymentservice`). Updated these to the current names used by the demo (`otel-collector`, `src/otel-collector/`, Valkey, `checkout`, `payment`, etc.).
- The startup and verification commands did not match the current demo's layered Docker Compose setup. Updated startup to use `make start` and verification/log commands to include the same compose files used by the Makefile.
- The listed Jaeger URL was incomplete for the current demo. Updated Jaeger links to `http://localhost:8080/jaeger/ui/`.
- The custom Collector override mounted a config path that the current Collector container does not use. Reworked the example to override the demo's `OTEL_COLLECTOR_CONFIG_EXTRAS` file and preserve the demo's existing pipeline components.
- The feature flag examples used outdated flag names and an unsupported `PUT /feature/productCatalogFailure` endpoint. Updated names and replaced the toggle example with the current flagd-ui read/write API.
- The custom service example pointed to `otel-col:4317`. Updated it to `otel-collector:4317`.
- The Collector metrics command queried an unpublished `localhost:8888/metrics` endpoint. Updated it to query Prometheus on `localhost:9090` through the Prometheus HTTP API.

## Review Notes
The current OpenTelemetry Demo changes quickly. The post is accurate against the official docs and the current upstream repository inspected on 2026-06-05, but future readers should re-check compose file names, feature flag names, and service names against the demo repository when upgrading.
