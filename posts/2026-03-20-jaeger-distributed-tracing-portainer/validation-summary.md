# Validation Summary: How to Set Up Distributed Tracing with Jaeger via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Jaeger
- Elasticsearch
- OpenTelemetry
- Python
- FastAPI
- HTTPX
- Node.js

## Sources Consulted
- Jaeger Getting Started (latest 2.x): https://www.jaegertracing.io/docs/2.17/getting-started/
- Jaeger Deployment (latest 2.x): https://www.jaegertracing.io/docs/2.17/deployment/
- Jaeger v2 sample config (`config.yaml`): https://raw.githubusercontent.com/jaegertracing/jaeger/v2.17.0/cmd/jaeger/config.yaml
- Jaeger v2 Elasticsearch sample config (`config-elasticsearch.yaml`): https://raw.githubusercontent.com/jaegertracing/jaeger/v2.17.0/cmd/jaeger/config-elasticsearch.yaml
- Jaeger v2 HTTP API v3 routes: https://github.com/jaegertracing/jaeger/blob/v2.17.0/cmd/jaeger/internal/extension/jaegerquery/internal/apiv3/http_gateway.go
- OpenTelemetry Python resource docs: https://opentelemetry-python.readthedocs.io/en/latest/sdk/resources.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry FastAPI instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/fastapi/fastapi.html
- OpenTelemetry HTTPX instrumentation docs: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/httpx/httpx.html
- OpenTelemetry JS README / current Node SDK example: https://github.com/open-telemetry/opentelemetry-js
- OpenTelemetry JS resources docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JS OTLP gRPC exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry JS semantic conventions docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry semantic conventions for deployment resources: https://opentelemetry.io/docs/specs/semconv/registry/entities/deployment/
- OpenTelemetry semantic conventions for database spans: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

## Issues Found
- The Jaeger deployment examples used old 1.x-style images and environment-variable configuration (`jaegertracing/all-in-one`, `jaeger-collector`, `jaeger-query`) while current Jaeger docs are 2.x and use the unified Jaeger image plus YAML configuration. I replaced the compose examples with current Jaeger 2.x patterns and mounted a Jaeger 2.x Elasticsearch config file for the production example.
- The production Elasticsearch health check required `green` cluster health, which is a poor fit for a single-node setup with replicas. I changed it to wait for `yellow`, which matches practical single-node Elasticsearch behavior.
- The Python example created resources with `Resource(...)`, but current OpenTelemetry Python docs recommend `Resource.create(...)`. I updated the snippet accordingly and made the service name / exporter endpoint read from environment variables so the deployment example actually configures the code shown.
- The Python sample hardcoded the collector hostname as `jaeger-collector`, which no longer matched the corrected Jaeger deployment. I updated it to use the current `jaeger` service name and aligned the deployment env vars with that endpoint.
- The Node.js example used outdated OpenTelemetry JS patterns (`new Resource(...)` and `SemanticResourceAttributes.*`). Current OpenTelemetry JS docs use `resourceFromAttributes(...)` and `ATTR_*` constants. I migrated the snippet to the current API shape.
- The Node.js shutdown example only called `sdk.shutdown()` inside a `SIGTERM` handler. With a signal handler installed, that is incomplete for graceful termination. I updated it to the current documented shutdown pattern that exits after shutdown completes.
- The service deployment example set OTEL environment variables that did not match how the Python and Node snippets were actually configured. I updated the application code and compose env vars so runtime configuration is consistent.
- The Step 6 examples used Jaeger’s older `/api/*` UI JSON API plus a non-portable `open` command. I replaced them with the current Jaeger v3 HTTP API routes (`/api/v3/traces` and `/api/v3/traces/{trace_id}`) verified from the Jaeger 2.17 source, and changed the browser instruction to a portable comment.

## Review Notes
- The post now targets Jaeger 2.x behavior as documented in April 2026, which is materially different from Jaeger 1.x deployment examples.
- Elasticsearch `8.11.0` is older than the current Elastic release line, but it remains within Jaeger’s supported Elasticsearch 8.x range and is technically valid as a pinned example version.
- The production example now depends on a mounted `config-elasticsearch.yaml` file. That is the current Jaeger 2.x configuration model and should be accounted for when deploying the stack through Portainer.
