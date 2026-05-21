# Validation Summary: How to Set Up Real-Time Dashboards for Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Grafana
- Grafana Helm chart
- Kiali
- Prometheus
- PromQL
- Kubernetes ConfigMaps

## Sources Consulted
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio Kiali integration documentation: https://istio.io/latest/docs/ops/integrations/kiali/
- Istio Visualizing Your Mesh task: https://istio.io/latest/docs/tasks/observability/kiali/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio observability concepts: https://istio.io/latest/docs/concepts/observability/
- Istio release-1.29 Prometheus addon manifest: https://raw.githubusercontent.com/istio/istio/release-1.29/samples/addons/prometheus.yaml
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/reference/dashboard/
- Grafana Helm chart values: https://github.com/grafana/helm-charts/blob/main/charts/grafana/values.yaml
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The Istio Grafana and Kiali addon commands used `release-1.22`, which is outdated for a 2026 post. Updated both sample addon URLs to `release-1.29`, matching current Istio documentation.
- The production Grafana Helm install targeted the `monitoring` namespace but did not create it. Added `--create-namespace` so the command works on a fresh cluster.
- The Prometheus datasource example was written as a standalone ConfigMap that the shown Helm install would not automatically mount or load. Replaced it with the Grafana Helm chart's `datasources.datasources.yaml` values format.
- The service-detail dashboard used only `destination_service_name`, which is ambiguous across namespaces. Added a `namespace` variable and namespace filters to the service-level queries.
- The outbound traffic panel compared `source_workload` to a service name, which is not the same Istio metric label. Added a workload variable derived from `destination_workload` and changed the outbound query to filter by `source_workload`.
- The CPU and memory panels used `container="$service"` and `pod=~"$service.*"`, which would often return no data because Kubernetes container names and service names do not generally match. Updated the queries to use namespace and workload-based pod filtering, with separate app and `istio-proxy` container filters.
- The alert dashboard used a 5-second refresh while the post recommends avoiding refresh intervals below the scrape interval. Changed it to 10 seconds.
- The Prometheus query performance example attempted to read `stats.timings.evalTotalTime` from the standard Prometheus query API response, which is not part of the documented response envelope. Replaced it with a `time curl -sG ... --data-urlencode` example that works with the standard API and correctly URL-encodes the PromQL expression.
- The dashboard auto-provisioning section could be read as storing the full API payload wrapper in ConfigMaps. Clarified that Grafana file provisioning should use the dashboard model JSON itself.

## Review Notes
- The custom dashboard JSON examples are syntactically valid JSON, but they remain simplified dashboard definitions. Production Grafana dashboards usually include additional metadata such as UIDs, schema versions, datasource references, and panel defaults.
- The workload-to-pod CPU and memory queries assume Kubernetes pod names begin with the workload name, which is typical for Deployment-managed pods but may need adjustment for StatefulSets, Jobs, or custom naming patterns.
