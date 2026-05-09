# Validation Summary: Calico Observability: troubleshoot-dropped-traffic-auditing-calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- FelixConfiguration
- Felix Prometheus metrics
- Calico flow logs
- Goldmane and Whisker
- Prometheus Operator PrometheusRule
- Grafana
- Fluent Bit, Loki, and Elasticsearch

## Sources Consulted
- Calico Felix configuration resource: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix Prometheus metrics: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source flow logs API and Whisker: https://docs.tigera.io/calico/latest/observability/enable-whisker
- Calico Cloud/Enterprise Felix flow log file settings: https://docs.tigera.io/calico-cloud/reference/resources/felixconfig
- calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status

## Issues Found
- The post presented `flowLogsFileEnabled` as a generic Calico flow log configuration. Current Calico Open Source documentation enables flow logs through Goldmane and Whisker, while file-based flow log settings are documented for Calico Cloud/Enterprise. I added the edition-specific caveat and included the Goldmane custom resource command for Open Source v3.30+ operator/Helm installs.
- The `CalicoHighDenyRate` alert used `felix_int_dataplane_failures`, but the official Felix metrics documentation describes that metric as dataplane update failures, not policy denies. I renamed the alert and summary to describe dataplane failures accurately.
- The conclusion described `felix_int_dataplane_failures` as iptables-specific and treated high policy deny rate as a Felix metric-backed signal. I changed the wording to dataplane programming errors and clarified that denied traffic should come from flow logs.

## Review Notes
- `felix_int_dataplane_failures`, `prometheusMetricsEnabled`, and `prometheusMetricsPort` are documented Felix fields/metrics, and port 9091 is the documented default metrics port.
- `calicoctl node status` is a valid command for checking Calico node status and BGP peering states.
- The PrometheusRule example assumes Prometheus Operator CRDs are installed and that a scrape job named `calico-node-metrics` exists; the job label may differ by cluster.
