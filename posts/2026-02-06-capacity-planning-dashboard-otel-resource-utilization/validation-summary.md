# Validation Summary: How to Create a Capacity Planning Dashboard from OpenTelemetry Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Host Metrics Receiver
- OpenTelemetry Kubelet Stats Receiver
- OpenTelemetry Kubernetes Cluster Receiver
- OpenTelemetry Prometheus Remote Write Exporter
- Prometheus / PromQL
- Grafana dashboards and alerts
- Kubernetes resource metrics

## Sources Consulted
- OpenTelemetry Host Metrics Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Host Metrics Receiver metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/hostmetricsreceiver/metadata.yaml
- OpenTelemetry host CPU, memory, filesystem, and network scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/hostmetricsreceiver/internal/scraper
- OpenTelemetry Kubelet Stats Receiver metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/kubeletstatsreceiver/metadata.yaml
- OpenTelemetry Kubernetes Cluster Receiver metadata: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/k8sclusterreceiver/metadata.yaml
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry system metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- OpenTelemetry Prometheus Remote Write Exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus OpenTelemetry backend guide: https://prometheus.io/docs/guides/opentelemetry/
- Prometheus PromQL query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus PromQL query basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The Collector configuration used deprecated component aliases: `hostmetrics`, `kubeletstats`, and `prometheusremotewrite`. Updated them to the current component types `host_metrics`, `kubelet_stats`, and `prometheus_remote_write`.
- The PromQL grouped by resource-derived labels such as `host_name` and `k8s_namespace_name`, but the Prometheus Remote Write exporter does not copy all resource attributes to metric labels by default. Enabled `resource_to_telemetry_conversion` in the exporter configuration.
- The Kubernetes request and allocatable examples referenced metrics that are not emitted by the Kubelet Stats Receiver alone. Added the Kubernetes Cluster Receiver to the configuration and updated the queries to use `k8s_container_cpu_request` and `k8s_node_allocatable_cpu`.
- The CPU utilization query averaged all CPU states, including idle, which does not represent host CPU usage. Updated it to average `1 - system_cpu_utilization{state="idle"}` across cores.
- The filesystem utilization queries filtered on `state="used"`, but current `system.filesystem.utilization` does not have a `state` attribute. Removed that filter from dashboard and alert queries.
- The network query used `system_network_io_total`, but with default Prometheus translation the byte counter is exposed with the bytes suffix as `system_network_io_bytes_total`. Updated the query.
- The runway formulas could report negative days or fire alerts when utilization was decreasing. Added derivative growth checks so runway estimates only appear when the trend is increasing.
- The Kubernetes CPU request explanation said a high ratio was close to "requested limits", which conflated requests and limits. Updated the wording to "requested CPU."
- The network section described a percentage of available bandwidth while the query returns throughput. Updated the heading to match the query.

## Review Notes
The examples assume Prometheus metric names are translated with the default `UnderscoreEscapingWithSuffixes` strategy and that the backend accepts Prometheus Remote Write at `/api/v1/write`. The Kubernetes receiver configuration also assumes an in-cluster Collector with `K8S_NODE_NAME` set and suitable RBAC permissions for kubelet and Kubernetes API access.
