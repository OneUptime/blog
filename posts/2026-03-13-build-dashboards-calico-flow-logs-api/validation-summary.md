# Validation Summary: How to Build Dashboards for the Calico Flow Logs API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Felix
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Grafana
- Alertmanager

## Sources Consulted
- Calico documentation: Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico documentation: View flow logs: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico documentation: Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Felix configuration: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus Operator documentation: Getting started with ServiceMonitor: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator documentation: Design, ServiceMonitor and PodMonitor: https://prometheus-operator.dev/docs/getting-started/design/

## Issues Found
- The post title, description, and introduction described Calico Flow Logs API dashboards, but the commands, ServiceMonitor, architecture, and conclusion were for Felix Prometheus metrics. I updated the title, description, and introduction to describe Felix metrics dashboards instead of Flow Logs API dashboards.
- The ServiceMonitor example selected `k8s-app: calico-node` but did not define the Kubernetes Service that the ServiceMonitor selects. ServiceMonitor selectors match Services and their Endpoints, not pods directly. I added a headless `felix-metrics-svc` Service with the same label and a named `http-metrics` port.
- The ServiceMonitor endpoint referenced `port: http-metrics`, but the original post had no Service port with that name. I added the named Service port so the ServiceMonitor can resolve the scrape target.

## Review Notes
- Calico Flow Logs API, also known as Goldmane, is a tech preview gRPC API for aggregated flow data. The corrected post no longer claims to build Flow Logs API dashboards because the implementation uses Felix Prometheus metrics.
- The Felix metrics names used in the command, including `felix_int_dataplane_failures` and `felix_calc_graph_*`, are present in the current Calico Felix Prometheus metric reference.
- Prometheus must be configured to select ServiceMonitor resources in the `calico-system` namespace for this ServiceMonitor to be scraped.
