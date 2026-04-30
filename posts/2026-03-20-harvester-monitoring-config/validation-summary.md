# Validation Summary: How to Configure Harvester Monitoring - Config

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Rancher Monitoring
- Prometheus
- Grafana
- Alertmanager
- Prometheus Operator
- KubeVirt
- Longhorn
- Kubernetes
- PromQL

## Sources Consulted
- Harvester Monitoring docs: https://docs.harvesterhci.io/v1.6/monitoring/harvester-monitoring/
- Rancher Prometheus configuration docs: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Rancher Monitoring chart source: https://github.com/rancher/charts/tree/main/charts/rancher-monitoring
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus remote write receiver docs: https://prometheus.io/docs/prometheus/latest/querying/api/#remote-write-receiver
- KubeVirt metrics reference: https://kubevirt.io/monitoring/metrics.html

## Issues Found
- The Harvester UI navigation was inaccurate and too version-specific. I changed `Advanced → Monitoring → Enable Monitoring` to `Advanced → Addons → rancher-monitoring`, and changed Grafana access to the documented Dashboard link.
- The alert examples mixed `node` and `instance` labels across queries, annotations, and Alertmanager grouping. I standardized the examples on `instance`, which is present on the referenced node-exporter metrics, so the query output and notification templates line up.
- The VM monitoring section used outdated or incorrect KubeVirt metrics. I replaced deprecated `kubevirt_vmi_memory_used_bytes` with `vmi:kubevirt_vmi_memory_used_bytes:sum`, and corrected the disk I/O metrics from nonexistent `*_times_ms_total` names to current `*_times_seconds_total` names.
- The remote-write section implied that any external Prometheus target would work as written. I corrected the wording to describe a remote-write-compatible endpoint and noted that the receiver must support the Prometheus remote-write API.
- The Best Practices section included an unsupported exact retention claim (`15 days`) and an unverified “most common incidents” statement. I replaced both with technically safe guidance that matches the official documentation.

## Review Notes
- The post does not pin a Harvester release, and monitoring behavior is version-sensitive. Using the `rancher-monitoring` addon terminology is safer across supported versions than older UI labels.
- If the destination in Step 6 is another Prometheus server, it must have `--web.enable-remote-write-receiver` enabled. Prometheus documents this as a cautionary, low-volume use case rather than a general replacement for scraping.
