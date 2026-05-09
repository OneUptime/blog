# Validation Summary: How to Troubleshoot the Calico Flow Logs API

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- FelixConfiguration
- Felix Prometheus metrics
- Kubernetes
- Prometheus Operator ServiceMonitor
- kubectl

## Sources Consulted
- Calico Flow Logs API documentation: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico enable flow logs documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico view flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico monitor component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Prometheus Operator getting started documentation: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post title, description, and introduction described Calico Flow Logs API troubleshooting, but the commands, ServiceMonitor, architecture, and conclusion were for Felix Prometheus metrics. Updated the title, description, and introduction to accurately describe Felix metrics troubleshooting.
- The ServiceMonitor example selected `k8s-app: calico-node` and referenced a port named `http-metrics`, but it did not create or show a Service with that label and named port. Added a headless `felix-metrics-svc` Service exposing port `9091` as `http-metrics`, matching Calico's documented Felix metrics port and Prometheus Operator's ServiceMonitor model.

## Review Notes
Calico documentation identifies the Flow Logs API as Goldmane, a tech preview gRPC API used by Whisker. The original post did not include Flow Logs API commands, API calls, Goldmane configuration, or Whisker troubleshooting steps, so the content was corrected to the Felix metrics topic it actually covered. I could not verify `kubectl patch --help` locally because `kubectl` is not installed in this workspace; the patch command syntax was checked against Calico's official documentation instead.
