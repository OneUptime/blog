# Validation Summary: How to Set Up Egress Monitoring Dashboards

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istio egress gateway
- Prometheus
- PromQL
- Grafana
- Kubernetes

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio egress gateway task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-gateway/
- Istio accessing external services task: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Istio installation configuration profiles: https://istio.io/latest/docs/setup/additional-setup/config-profiles/
- Istio BlackHoleCluster/Passthrough monitoring blog: https://istio.io/latest/blog/2019/monitoring-external-service-traffic/
- Prometheus querying functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus alerting rules: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/

## Issues Found
- The post stated that the Istio demo profile includes Prometheus and Grafana addons. Current Istio documentation shows the demo profile enables core components such as the egress gateway, while Prometheus and Grafana are installed separately as sample addons. Updated the prerequisite wording.
- The error-rate panel queried an absolute non-2xx request rate but recommended percentage thresholds. Updated the PromQL to calculate a percentage by dividing non-2xx request rate by total request rate.
- The TCP connection panel described active connections while the query used `istio_tcp_connections_opened_total`, a counter for opened connections. Updated the wording to describe new TCP connections.

## Review Notes
The metric names, Istio labels, histogram quantile usage, Grafana variable examples, BlackHoleCluster concept, and Prometheus alert-rule structure are consistent with the official documentation reviewed. The sample dashboard JSON is intentionally minimal and may need datasource UID adjustments in newer Grafana provisioning workflows, but it is plausible as an import/customization snippet.
