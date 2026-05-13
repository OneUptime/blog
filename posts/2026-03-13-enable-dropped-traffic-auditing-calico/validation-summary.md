# Validation Summary: Calico Observability: enable-dropped-traffic-auditing-calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Felix Prometheus metrics
- Calico flow logs API, Goldmane, and Whisker
- Prometheus Operator PrometheusRule
- Grafana
- calicoctl

## Sources Consulted
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Monitoring Felix with Prometheus: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Monitor Calico component metrics: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Enable the flow logs API and Calico Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico calicoctl node status: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post enabled flow logs by patching `flowLogsFlushInterval` and `flowLogsFileEnabled` on `FelixConfiguration`. Those file-reporting fields are not part of the current Calico Open Source FelixConfiguration reference; current Calico Open Source flow logs are enabled through the operator-managed Goldmane and Whisker resources. I replaced the patch command with `Goldmane` and `Whisker` manifests.
- The architecture diagram routed flow logs through Fluent Bit to Loki or Elasticsearch, which does not match the current Calico Open Source flow logs API workflow. I changed it to show flow logs going through Goldmane to Whisker.
- The alert named `CalicoHighDenyRate` used `felix_int_dataplane_failures`, but Calico documents that metric as dataplane update failures, not policy deny traffic. I renamed the alert and summary to describe Felix dataplane failures accurately.
- The conclusion described high policy deny rate as one of the key signals in the same context as Felix metrics. I changed that wording to denied traffic in flow logs and generalized the recommendation to alerts or dashboards.

## Review Notes
The `kubectl patch` syntax, Felix metrics port `9091`, `felix_int_dataplane_failures` metric name, `calicoctl node status` command, and PrometheusRule API shape are consistent with the consulted documentation. Calico flow logs in Open Source are documented as tech preview, so future Calico releases may change this workflow.
