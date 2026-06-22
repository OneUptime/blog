# Validation Summary: How to Deploy OpenTelemetry Collector with Helm

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Helm chart
- Kubernetes
- Helm
- Collector receivers, processors, exporters, and connectors
- Prometheus metrics scraping and exporting

## Sources Consulted
- OpenTelemetry Collector Helm chart documentation: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Helm chart values.yaml: https://github.com/open-telemetry/opentelemetry-helm-charts/blob/main/charts/opentelemetry-collector/values.yaml
- OpenTelemetry Helm chart templates: https://github.com/open-telemetry/opentelemetry-helm-charts/tree/main/charts/opentelemetry-collector/templates
- OpenTelemetry Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry OTLP Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Kubelet Stats Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OpenTelemetry Host Metrics Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Kubernetes Attributes Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/k8sattributesprocessor/README.md
- OpenTelemetry Tail Sampling Processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Span Metrics Connector README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/connector/spanmetricsconnector/README.md
- OpenTelemetry container log parser operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/container.md

## Issues Found
- Replaced the removed/deprecated `logging` exporter with the current `debug` exporter and changed pipelines to reference `debug`.
- Changed the gateway Helm values from invalid `service.ports` list syntax to the chart's top-level `ports` map, and enabled the internal metrics and Prometheus exporter service ports.
- Updated the Collector self-scrape target from `0.0.0.0:8888` to `${env:MY_POD_IP}:8888`, matching the chart's runtime environment.
- Added the configured `resource` processor to the gateway pipelines so the documented resource attributes are actually applied.
- Replaced the manual Kubernetes container log parsing chain with the official `container` operator, which supports Docker, CRI-O, and containerd log formats.
- Added `root_path: /hostfs` and the corresponding host filesystem mount for `hostmetrics`, so the daemonset collects node metrics rather than container filesystem metrics.
- Updated the kubeletstats endpoint to use the Helm chart's always-present `OTEL_K8S_NODE_NAME` environment variable.
- Added the missing `nodes/stats` RBAC rule required by the kubeletstats receiver.
- Corrected the agent OTLP exporter endpoint to the service name created by `helm install otel-gateway open-telemetry/opentelemetry-collector`.
- Replaced deprecated `spanmetrics.dimensions_cache_size` with `aggregation_cardinality_limit`.

## Review Notes
Helm and kubectl were not installed in the review environment, so live `helm template` and cluster checks could not be run. The fenced YAML snippets were parsed locally with PyYAML successfully.
