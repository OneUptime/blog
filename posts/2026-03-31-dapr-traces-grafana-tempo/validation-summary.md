# Validation Summary: How to Send Dapr Traces to Grafana Tempo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (distributed application runtime)
- Grafana Tempo (distributed tracing backend)
- OpenTelemetry Collector (telemetry pipeline)
- Grafana (observability dashboards)
- Kubernetes / Helm
- OTLP (OpenTelemetry Protocol)

## Sources Consulted
- Dapr Configuration spec and tracing docs: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr OpenTelemetry Collector tracing setup: https://docs.dapr.io/operations/observability/tracing/otel-collector/open-telemetry-collector/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Grafana Tempo Helm chart values (grafana/tempo): https://artifacthub.io/packages/helm/grafana/tempo
- Grafana Tempo HTTP API documentation: https://grafana.com/docs/tempo/latest/api_docs/
- Grafana data source provisioning API: https://grafana.com/docs/grafana/latest/developers/http_api/data_source/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Kubernetes deployment examples: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/examples/kubernetes

## Issues Found

### 1. OpenTelemetry Collector ConfigMap not mounted (Critical)
**What was wrong:** The blog used `kubectl create deployment otel-collector --image=...` to create the collector deployment, but this imperative command does not mount the ConfigMap containing the custom collector configuration. The collector would start with its built-in default config rather than the custom pipeline pointing to Tempo.

**What was changed:** Replaced the imperative `kubectl create deployment` and `kubectl expose` commands with a proper Kubernetes Deployment and Service YAML manifest that mounts the `otel-collector-config` ConfigMap as a volume at `/etc/otel` and passes `--config=/etc/otel/config.yaml` as a container argument.

**Why:** Without the volume mount, the collector ignores the custom config entirely, which means traces would never reach Tempo — defeating the entire purpose of the tutorial.

### 2. Incorrect Tempo HTTP API port (Critical)
**What was wrong:** The blog used port 3100 for the Tempo HTTP API in two places: the Grafana data source URL (`http://tempo:3100`) and the search API query (`http://tempo:3100/api/search`). Port 3100 is Grafana Loki's default port, not Tempo's. Tempo's HTTP API listens on port 3200 by default (`http_listen_port: 3200` in the Helm chart values).

**What was changed:** Updated both references from port 3100 to port 3200.

**Why:** Using the wrong port would cause both the Grafana data source connection and the manual trace query to fail.

### 3. Missing authentication in Grafana API call (Moderate)
**What was wrong:** The `curl` command to add Tempo as a Grafana data source did not include any authentication. Grafana's HTTP API requires authentication, and without it the request would return 401 Unauthorized.

**What was changed:** Added `-u admin:admin` (default Grafana admin credentials) to the curl command, with a comment noting these are default credentials.

**Why:** The command as written would fail immediately, preventing readers from completing the tutorial.

## Review Notes
- The `grafana/tempo` Helm chart has been migrated from the `grafana/helm-charts` repository to `grafana-community/helm-charts` as of early 2026. The existing repo URL still works but may eventually stop updating. Future revisions may want to note this.
- The Helm `--set tempo.storage.trace.local.path=/var/tempo` differs from the chart default of `/var/tempo/traces`. This is a valid customization but readers should be aware of the difference.
- The Dapr Configuration resource, annotations, OTLP receiver config, batch processor config, and Tempo search API usage are all correct and current.
- The architecture description (Dapr Sidecar → OTel Collector → Tempo → Grafana) is accurate.
