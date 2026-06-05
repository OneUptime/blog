# Validation Summary: How to Set Up SigNoz as a Self-Hosted OpenTelemetry Backend

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- SigNoz
- OpenTelemetry
- OpenTelemetry Collector / OTLP
- Docker Compose
- Kubernetes
- Helm
- ClickHouse
- Node.js OpenTelemetry SDK
- Python OpenTelemetry SDK

## Sources Consulted
- SigNoz Docker Standalone installation docs: https://signoz.io/docs/install/docker/
- SigNoz Kubernetes installation docs: https://signoz.io/docs/install/kubernetes/
- SigNoz AKS Helm installation example: https://signoz.io/docs/install/kubernetes/aks/
- SigNoz Helm chart values: https://github.com/SigNoz/charts/blob/main/charts/signoz/values.yaml
- SigNoz Docker Compose file: https://github.com/SigNoz/signoz/blob/main/deploy/docker/docker-compose.yaml
- OpenTelemetry JavaScript exporters docs: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript resources API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- OpenTelemetry Python exporters docs: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry deployment semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/

## Issues Found
- The Docker Compose deployment path was outdated. Updated `signoz/deploy/docker/clickhouse-setup` to `signoz/deploy/docker`, matching current SigNoz Docker installation docs.
- The Docker Compose command missed the documented `--remove-orphans` option. Updated the command to `docker compose up -d --remove-orphans`.
- The SigNoz UI port was outdated. Updated Docker access from `http://localhost:3301` to `http://localhost:8080`.
- The Docker file listing referenced `clickhouse-config.xml` in the deployment directory. Updated it to point to the current shared ClickHouse configuration directory under `../common/clickhouse/`.
- The architecture and text described separate query service and frontend components. Updated this to the current SigNoz service model used by the Docker and Helm deployments.
- The Helm values used outdated `queryService` and `frontend` keys. Replaced them with the current `signoz.resources` key and kept `otelCollector.resources`.
- The Kubernetes port-forward command referenced an outdated frontend service and port. Updated it to `kubectl port-forward svc/signoz -n signoz 8080:8080`.
- The Helm install timeout was shorter than SigNoz's documented example. Updated it from `10m` to `1h`.
- The JavaScript snippet imported an unused logs exporter and used the old direct `Resource` constructor style. Removed the unused import and updated the resource creation to `resourceFromAttributes`.
- The resource examples used deprecated `deployment.environment`. Updated both Node.js and Python examples to the stable `deployment.environment.name` semantic convention.

## Review Notes
The post is technically valid after the fixes. SigNoz and OpenTelemetry evolve quickly, so future reviews should re-check chart value keys, service names, and OpenTelemetry semantic convention constants against the latest official docs.
