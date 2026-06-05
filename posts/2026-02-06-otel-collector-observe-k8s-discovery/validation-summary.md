# Validation Summary: How to Configure the OpenTelemetry Collector to Export Metrics

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OTLP receiver and OTLP HTTP exporter
- Prometheus receiver and Kubernetes pod service discovery
- Kubernetes DaemonSet, ServiceAccount, RBAC, and pod annotations
- Kubernetes Attributes processor
- Kubelet Stats receiver
- Observe Inc OpenTelemetry ingestion

## Sources Consulted
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector kubeletstats receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/kubeletstatsreceiver
- OpenTelemetry Collector k8sattributes processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Prometheus configuration and relabeling documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Observe OpenTelemetry endpoint documentation: https://docs.observeinc.com/en/o4snewdocs/content/data-ingestion/endpoints/otel.html
- Observe existing OpenTelemetry Collector forwarding documentation: https://docs.observeinc.com/en/o4snewdocs/content/send-data/otel-collector.html

## Issues Found
- The Observe exporter used the OTLP/gRPC exporter with `collect.observeinc.com:4317`, but Observe documents OTLP ingestion over HTTP/protobuf at the customer-specific collection endpoint. Changed the exporter to `otlphttp/observe`, set the endpoint to `https://${env:OBSERVE_CUSTOMER_ID}.collect.observeinc.com/v2/otel`, and updated all pipelines to use that exporter.
- The Observe authorization header included the customer ID in the bearer value. Observe's Collector examples use the datastream token as the bearer token. Changed the header to `authorization: "Bearer ${env:OBSERVE_TOKEN}"`.
- The Prometheus relabeling rule for `prometheus.io/port` referenced two capture groups while only reading the annotation value. Changed the rule to read both `__address__` and the annotation port, use a regex that captures host and port separately, and use `$1:$2` so the Collector does not treat Prometheus capture groups as environment substitutions.
- The Prometheus receiver used Kubernetes pod discovery in a DaemonSet without restricting discovered targets to the local node. That would cause every Collector pod to scrape every annotated pod and create duplicate metrics. Added a relabel keep rule on `__meta_kubernetes_pod_node_name` using `${env:K8S_NODE_NAME}`.
- The Kubernetes Attributes processor was not filtered to the current node and only associated telemetry by `k8s.pod.ip`. Added `filter.node_from_env_var: K8S_NODE_NAME` for the DaemonSet pattern and added a connection-based association fallback, which is the documented default association method for direct pod-to-Collector traffic.
- The Collector config used bare environment substitutions such as `${K8S_NODE_NAME}`. Updated them to the documented Collector form, such as `${env:K8S_NODE_NAME}`.
- The `k8s_cluster` receiver was configured in a DaemonSet example but not included in any pipeline. Running that receiver on every DaemonSet pod would also duplicate cluster-wide metrics. Removed it from the per-node DaemonSet configuration and clarified the surrounding text as workload and node observability.

## Review Notes
- I ran the updated Collector config through `otel/opentelemetry-collector-contrib:latest validate`. The config parsed and proceeded to component creation, then stopped because the local Docker container was not running inside Kubernetes and could not read `/var/run/secrets/kubernetes.io/serviceaccount/ca.crt` for the `kubeletstats` receiver.
- The Kubernetes manifest assumes a ConfigMap named `otel-collector-config` exists with the Collector configuration mounted at `/etc/otelcol-contrib/config.yaml`.
