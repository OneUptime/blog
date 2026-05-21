# Validation Summary: How to Generate Compliance Reports from Istio Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- Prometheus and PromQL
- Kubernetes and kubectl
- Kubernetes CronJob
- jq
- Grafana dashboards
- kube-state-metrics custom resource metrics

## Sources Consulted
- Istio standard metrics documentation: https://istio.io/latest/docs/reference/config/metrics/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- Grafana thresholds documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-thresholds/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/

## Issues Found
- The mTLS percentage queries summed raw `istio_requests_total` counter values, which reports cumulative counts since series start and is vulnerable to counter reset interpretation. Updated the examples to use `increase(...[7d])` for report windows and `rate(...[5m])` for the dashboard gauge.
- The mTLS queries did not filter `reporter="destination"`. Istio documents that `connection_security_policy` is set to `mutual_tls` when the report is from the destination and can be `unknown` from the source, so the queries now filter destination-reported metrics.
- The AuthorizationPolicy export treated a missing `.spec.action` as `DENY-ALL`. Istio's default action is `ALLOW`; changed the jq fallback to `ALLOW`.
- The denied-request examples and audit summary did not filter destination-reported Istio request metrics. Added `reporter="destination"` to avoid source/destination double counting and unreliable destination labels.
- The access-control example comment said "Denied requests by policy" even though the query groups by namespace and service, not policy. Updated the comment to "Denied requests by service."
- The Kubernetes events examples filtered on `reason=Updated`, which is not a reliable generic Kubernetes event reason for Istio CRD spec changes. Updated the examples to filter by `involvedObject.kind` and clarified that events are short-lived and may not capture every update.
- The service communication map used raw request counters without a destination reporter filter. Updated it to use `increase(...[7d])` with `reporter="destination"`.
- The CronJob used `bitnami/kubectl:latest` while the command also requires bash, curl, jq, and the AWS CLI. Replaced it with a custom reporter image placeholder that explicitly includes the required tools.
- The Grafana threshold snippet used a legacy/simplified root-level `thresholds` array. Updated it to the current dashboard model style under `fieldConfig.defaults.thresholds.steps`.
- The Grafana access-denials panel title said "Last 24h" but used a 5-minute rate. Updated the panel to show rolling 24-hour increases.

## Review Notes
The `kube_customresource_authorizationpolicy_info` metric used in the Grafana example is not emitted by Kubernetes or Istio by default; it requires exposing Istio custom resources through kube-state-metrics custom resource metrics or an equivalent exporter. The post is otherwise technically valid after the corrections above.
