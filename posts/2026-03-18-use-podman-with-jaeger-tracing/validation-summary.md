# Validation Summary: How to Use Podman with Jaeger for Tracing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Jaeger
- OpenTelemetry
- Python
- Flask
- Node.js
- Express
- Elasticsearch
- Compose YAML

## Sources Consulted
- Jaeger Getting Started 2.17: https://www.jaegertracing.io/docs/2.17/getting-started/
- Jaeger Deployment 2.17: https://www.jaegertracing.io/docs/2.17/deployment/
- Jaeger APIs: https://www.jaegertracing.io/docs/latest/architecture/apis/
- Jaeger Sampling: https://www.jaegertracing.io/docs/sampling/
- Jaeger v2 example config (`all-in-one.yaml`): https://github.com/jaegertracing/jaeger/blob/v2.17.0/cmd/jaeger/internal/all-in-one.yaml
- Jaeger v2 example config (`config-elasticsearch.yaml`): https://github.com/jaegertracing/jaeger/blob/v2.17.0/cmd/jaeger/config-elasticsearch.yaml
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters docs: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python sampling docs: https://opentelemetry-python.readthedocs.io/en/stable/sdk/trace.sampling.html
- OpenTelemetry JS OTLP gRPC exporter docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_exporter-trace-otlp-grpc.html
- OpenTelemetry JS resources docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry JS repository quick start and v2 guidance: https://github.com/open-telemetry/opentelemetry-js
- OpenTelemetry general SDK configuration: https://opentelemetry.io/docs/languages/sdk-configuration/general/
- Podman `run` docs: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The Jaeger deployment examples were written against older image/layout assumptions. I replaced `jaegertracing/all-in-one:latest` and the `jaeger-collector` / `jaeger-query` `:latest` examples with version-pinned Jaeger v2 usage based on current official docs, and updated the production example to use an explicit Jaeger config file with Elasticsearch.
- The Node.js tracing example used outdated OpenTelemetry JS patterns. I replaced `new Resource(...)` with `resourceFromAttributes(...)` and changed span processor registration to the current constructor-based `spanProcessors` configuration used by OpenTelemetry JS v2 examples.
- The Python example's install command omitted runtime dependencies required by the code snippet. I added `flask` and `requests`.
- The compose environment variables in the multi-service example did not match the application code because the code hard-coded the service name and OTLP endpoint. I updated both the Python and Node.js snippets to read `OTEL_SERVICE_NAME` and `OTEL_EXPORTER_OTLP_ENDPOINT`, making the compose example accurate.
- The sampling section was technically misleading for the code shown. The original section configured Jaeger's sampling strategies file, but the post's Python and Node.js examples use OpenTelemetry SDK sampling. I replaced that section with standard OpenTelemetry sampler environment variables and per-service examples that align with the SDKs in the article.
- The inventory service example treated an empty `items` query string as one empty item. I fixed it by filtering empty values before counting and mapping items.
- The query section implied a general stable Jaeger API. I clarified that the examples use the Jaeger query service's JSON API.

## Review Notes
- Jaeger's `16686/api/*` JSON endpoints are primarily the UI/query JSON API. Jaeger documents that interface separately from its recommended gRPC/OTLP-based query APIs, so long-term external integrations should evaluate the stable query APIs as well.
- The production example is validated against Jaeger `2.17.0` and Elasticsearch `8.12.0` as of May 7, 2026.
- With external storage backends, Jaeger service dependency graphs may require an additional dependency processing job; this post does not cover that operational detail.
