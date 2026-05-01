# Validation Summary: How to Set Up Distributed Tracing with Jaeger via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Jaeger
- OpenTelemetry
- Portainer
- Docker Compose
- Elasticsearch
- Node.js

## Sources Consulted
- Jaeger APIs (v1.55): https://www.jaegertracing.io/docs/1.55/architecture/apis/
- Jaeger deployment docs (1.x archive): https://www.jaegertracing.io/docs/1.76/deployment/
- Jaeger monitoring docs (1.x archive): https://www.jaegertracing.io/docs/1.54/monitoring/
- Jaeger migration guidance for retired Jaeger SDKs: https://www.jaegertracing.io/sdk-migration/
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry JavaScript exporters: https://opentelemetry.io/docs/languages/js/exporters/
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose network reference: https://docs.docker.com/reference/compose-file/networks/
- Portainer stack deployment docs: https://docs.portainer.io/2.21/user/docker/stacks/add
- Elastic Docker installation docs: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-with-docker

## Issues Found
- The architecture diagram showed a separate OpenTelemetry Collector even though the post deploys Jaeger all-in-one and sends OTLP directly to Jaeger. I corrected the diagram to match the actual deployment model described by Jaeger’s OTLP docs.
- The prerequisites suggested Jaeger client libraries as a current option. Jaeger’s official migration guidance says Jaeger SDKs were retired in 2022, so I changed this to OpenTelemetry with OTLP export.
- The all-in-one Compose example exposed port `9411` as a Zipkin endpoint without enabling the Zipkin receiver. I added `COLLECTOR_ZIPKIN_HOST_PORT=:9411` so the exposed port matches the documented behavior.
- The health section referenced port `14269`, but the all-in-one Compose example did not expose it. I added the admin port mapping so the health and metrics examples are reachable as written.
- The application configuration implied the hostname `jaeger` would always resolve, but Docker service-name resolution only works on a shared network. I added the note that application containers must be on the same Docker network as the Jaeger service.
- The production Elasticsearch example was incomplete because it defined only `jaeger-collector`, which would ingest traces but not provide the Jaeger UI. I added `jaeger-query` and its required Elasticsearch settings.
- The Elasticsearch image used `elasticsearch:8.12.0`, while Elastic’s official Docker docs publish the supported images from `docker.elastic.co`. I updated the image reference to the official registry path.
- The all-in-one example comment implied in-memory storage was suitable for small production use. Jaeger’s docs state in-memory storage is transient and not intended for production, so I narrowed the wording to dev/staging and single-node evaluation use.

## Review Notes
- The post intentionally pins Jaeger `1.55`, and the corrected examples are accurate for that 1.x line. Current Jaeger releases are 2.x and use different container image and configuration conventions, so a future version refresh would require more than editorial edits.
- The Node.js OpenTelemetry example is technically valid as written: it uses the OTLP HTTP exporter and appends `/v1/traces`, which matches OpenTelemetry’s endpoint rules for explicit per-signal URLs.
