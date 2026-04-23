# Validation Summary: How to Deploy OpenTelemetry Collector on Rancher - Otel

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- OpenTelemetry Operator
- OpenTelemetry Collector
- Jaeger
- Prometheus
- Grafana Loki

## Sources Consulted
- OpenTelemetry Operator Helm chart docs: https://opentelemetry.io/docs/platforms/kubernetes/helm/operator/
- OpenTelemetry Operator README and examples: https://github.com/open-telemetry/opentelemetry-operator
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- `hostmetrics` receiver docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/hostmetricsreceiver/README.md
- `kubeletstats` receiver docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/kubeletstatsreceiver/README.md
- `k8sattributes` processor docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/processor/k8sattributesprocessor/README.md
- `k8s_events` receiver docs: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/k8seventsreceiver/README.md
- Loki exporter deprecation notice: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/exporter/lokiexporter/README.md
- Grafana Loki OTLP ingestion docs: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki / OTel collector guidance: https://grafana.com/docs/enterprise-logs/latest/send-data/otel/
- Prometheus feature flags docs: https://prometheus.io/docs/prometheus/2.55/feature_flags/
- Prometheus storage docs for remote-write receiver: https://prometheus.io/docs/prometheus/3.3/storage/
- Prometheus OpenTelemetry backend guide: https://prometheus.io/docs/guides/opentelemetry/
- OpenTelemetry Kubernetes Helm chart docs: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/

## Issues Found
- The Helm install command omitted the webhook certificate settings required when cert-manager is not present. I added `admissionWebhooks.certManager.enabled=false` and `admissionWebhooks.autoGenerateCert.enabled=true` so the command is self-contained and matches the official chart guidance.
- The main deployment used `replicas: 2` while also scraping Prometheus targets and watching Kubernetes events. That would duplicate metrics and event logs without a target allocator or leader-election strategy, so I changed the example to a single replica.
- The `k8sattributes` configuration used a node filter that was not defined in the example and is inappropriate for a central deployment collector. I removed the node filter and the custom pod association override so the processor falls back to the documented default connection-based association behavior.
- The post used the deprecated Loki exporter. I replaced it with `otlphttp` against Loki’s native OTLP endpoint at `/otlp`, which is the current recommended ingestion path.
- The daemonset example was incomplete for host-level collection. It was missing the downward-API node-name env var, host filesystem mount, `root_path`, and a proper kubelet HTTPS endpoint. I added the required pod-spec fields and receiver settings.
- The `Instrumentation` custom resource used the wrong field shape. I changed the example from a top-level `endpoint` field to `spec.exporter.endpoint`, which matches the current operator API.
- The sample Java `Deployment` was invalid for `apps/v1` because it omitted `spec.selector` and matching pod labels. I added the required selector and labels.
- The verification section tried to port-forward a Service for extension and internal telemetry ports that the operator does not expose from receiver parsing, and it queried the wrong default health path. I changed the checks to port-forward a pod directly and updated the health request to `/`.

## Review Notes
- The Prometheus endpoint shown in the post requires Prometheus to run with the remote-write receiver enabled; I added this requirement inline where the exporter is configured.
- Collector internal metrics still default to port `8888`, but current Collector docs note that `service.telemetry.metrics.address` is ignored starting in Collector `v0.123.0`; newer custom listener configuration belongs under `service.telemetry.metrics.readers`.
- The example still uses `service.cluster` as a custom resource attribute. That is valid, but it is not an OpenTelemetry semantic-convention key.
