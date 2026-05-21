# Validation Summary: How to Set Up Complete Monitoring and Alerting with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio service mesh
- Envoy sidecar metrics
- Prometheus and PromQL
- Prometheus Operator `PrometheusRule`
- Alertmanager
- Grafana dashboards
- Kubernetes CronJob
- Istio `VirtualService` fault injection
- kubectl

## Sources Consulted
- Istio standard metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio `pilot-discovery` exported control-plane metrics: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio `VirtualService` reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- The control-plane recording rule used `pilot_xds_push_errors`, which is not listed in the current Istio `pilot-discovery` exported metrics. Changed it to combine `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects`, which are current istiod XDS error/reject metrics.
- The Alertmanager routing example used deprecated `match` and `match_re` route fields. Updated the routes to use `matchers`, matching current Alertmanager configuration guidance.
- The PagerDuty example used `service_key`, which is still supported for the older PagerDuty Prometheus integration but is not the current Events API v2 path. Changed it to `routing_key` and adjusted the placeholder name.

## Review Notes
- The Grafana JSON is a partial illustrative panel snippet rather than a complete importable dashboard model; that is acceptable in context because the post presents it as an example of panels to create.
- The example thresholds are operational starting points and should still be tuned per mesh and service SLOs.
