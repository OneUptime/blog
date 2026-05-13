# Validation Summary: How to Enable the Calico Flow Logs API

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Goldmane flow logs API
- Calico Whisker
- Kubernetes custom resources
- gRPC / Protocol Buffers

## Sources Consulted
- Calico documentation, Enable flow logs: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico documentation, Flow logs API: https://docs.tigera.io/calico/latest/observability/flow-logs-api
- Calico operator installation API reference, Goldmane resource: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Goldmane API protobuf: https://github.com/projectcalico/calico/blob/master/goldmane/proto/api.proto
- Calico documentation, Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation, FelixConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation, Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The post described the flow logs API as a REST API available only in Calico Enterprise and Calico Cloud. Current Calico Open Source documentation describes the flow logs API as Goldmane, a tech preview gRPC API that powers Whisker. I updated the description and introduction accordingly.
- The key commands enabled Felix Prometheus metrics rather than the flow logs API. Felix metrics are valid Calico observability features, but they do not enable Goldmane. I replaced those commands with the official `Goldmane` custom resource and optional `Whisker` custom resource.
- The ServiceMonitor example targeted Calico node metrics and selected pod labels as if it enabled flow logs. I replaced it with the relevant Goldmane and Whisker operator resources.
- The architecture diagram and conclusion described Prometheus, Grafana, and Alertmanager for Felix metrics instead of the flow logs API path. I updated them to show Calico node flow data, Goldmane, Whisker, custom gRPC clients, and SIEM/analytics consumers.

## Review Notes
- The Calico flow logs API is documented as tech preview in the current Calico Open Source documentation, so production use should account for possible API changes.
- Calico documentation notes that Goldmane and Whisker are installed by default in new Calico Open Source 3.30 and later operator or Helm installations, but upgraded clusters from earlier versions need them enabled manually.
