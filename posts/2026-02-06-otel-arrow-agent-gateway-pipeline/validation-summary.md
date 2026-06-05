# Validation Summary: How to Set Up an Agent-to-Gateway Pipeline Using OTel Arrow for High-Efficiency

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Protocol with Apache Arrow / OTel Arrow
- OTLP over gRPC and OTLP/HTTP
- Kubernetes DaemonSet, Deployment, and Service resources
- Kubernetes attributes processor
- Resource detection processor
- Prometheus remote write, Tempo, Mimir, and Grafana Loki

## Sources Consulted
- OpenTelemetry Collector Contrib OTel Arrow exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/otelarrowexporter
- OpenTelemetry Collector Contrib OTel Arrow receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/otelarrowreceiver
- OpenTelemetry Collector Contrib v0.96.0 OTel Arrow exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.96.0/exporter/otelarrowexporter/README.md
- OpenTelemetry Collector Contrib v0.96.0 OTel Arrow receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.96.0/receiver/otelarrowreceiver/README.md
- OpenTelemetry Collector exporter helper README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector Contrib Kubernetes attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor
- OpenTelemetry Collector Contrib resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/
- Grafana Loki HTTP API documentation: https://grafana.com/docs/loki/latest/api/

## Issues Found
- The post pinned `otel/opentelemetry-collector-contrib:0.96.0`, but that image does not ship the `otelarrow` receiver/exporter. Updated both Kubernetes manifests to `otel/opentelemetry-collector-contrib:0.153.0`, which includes the required components.
- The agent config used the deprecated `resourcedetection` component name. Updated it to the current `resource_detection` name and changed the pipeline references.
- The gateway attempted to associate Kubernetes metadata by `host.name`. For agent-to-gateway topologies, the gateway needs a pod-identifying attribute such as `k8s.pod.ip`; added `k8sattributes` passthrough mode on the agent and changed gateway `pod_association` to `k8s.pod.ip`.
- The OTel Arrow stream lifetime was set to `10m` while the receiver keepalive grace was only `30s`. Updated the receiver keepalive values and set the exporter `max_stream_lifetime` to `9m30s`, matching the upstream guidance to close streams before the receiver forcibly resets the connection.
- The gateway receiver placed `arrow.memory_limit_mib` under `protocols.grpc`, which is rejected by the `0.153.0` Collector schema. Moved it to `protocols.arrow`.
- The agent exporter queue size was `500`, which is invalid with the current exporter helper batching defaults because the default batch `min_size` is larger than the queue. Increased `queue_size` to `10000`.
- The post used the older `loki` exporter and Loki push endpoint. Updated logs export to `otlphttp/loki` with Loki's OTLP endpoint, `http://loki:3100/otlp`.

## Review Notes
Validated the corrected agent and gateway Collector configurations with `docker run --rm otel/opentelemetry-collector-contrib:0.153.0 validate --config=/etc/otel/config.yaml`. The Kubernetes snippets assume the referenced ConfigMaps, backend services, namespace, and Kubernetes RBAC for the gateway `k8sattributes` processor are created separately.
