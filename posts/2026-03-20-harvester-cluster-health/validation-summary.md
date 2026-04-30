# Validation Summary: How to Monitor Harvester Cluster Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- Rancher
- Prometheus
- Grafana
- Kubernetes
- KubeVirt
- Longhorn
- Prometheus Operator

## Sources Consulted
- Harvester Monitoring documentation: https://docs.harvesterhci.io/v1.6/monitoring/harvester-monitoring/
- Harvester Virtualization Management documentation: https://docs.harvesterhci.io/v1.7/rancher/virtualization-management/
- Harvester Overview documentation: https://docs.harvesterhci.io/v1.7/
- KubeVirt metrics reference: https://kubevirt.io/monitoring/metrics.html
- Longhorn metrics reference: https://longhorn.io/docs/latest/monitoring/metrics/
- Longhorn CRD definitions: https://github.com/longhorn/longhorn/blob/v1.11.1/chart/templates/crds.yaml
- Rancher Monitoring chart values: https://github.com/rancher/charts/blob/dev-v2.13/charts/rancher-monitoring/106.0.1+up66.7.1-rancher.10/values.yaml
- Rancher Monitoring node exporter ServiceMonitor template: https://github.com/rancher/charts/blob/dev-v2.13/charts/rancher-monitoring/106.0.1+up66.7.1-rancher.10/charts/prometheus-node-exporter/templates/servicemonitor.yaml

## Issues Found
- The post implied monitoring was simply built in and ready to use, but current Harvester documentation says the `rancher-monitoring` add-on is disabled by default on new installations. I updated the introduction to note that the add-on must be enabled first.
- The Rancher UI navigation for reaching Grafana was inaccurate. Harvester documentation points users to the Harvester `Dashboard` and its Grafana link, so I corrected the access steps.
- The Grafana credential note was too vague. Harvester documentation states the default Grafana admin password is `prom-operator`, and the Rancher Monitoring chart defaults the admin username to `admin`, so I clarified the note.
- The VM health PromQL used `count(kubevirt_vmi_phase_count...)`, which both relied on a deprecated KubeVirt recording rule and produced incorrect counts because it counted series instead of VM instances. I replaced it with `sum(node:kubevirt_vmi_phase:sum{...})`.
- The Longhorn robustness query was incorrect. `longhorn_volume_robustness` is a label-based state metric, not a numeric enum where `3` means healthy, so I replaced it with `longhorn_volume_robustness{state="healthy"} == 1`.
- The Longhorn CLI example used `lhvolume`, which is not a valid Longhorn short name. I replaced it with the canonical `volumes.longhorn.io` resource.
- Two kubectl comments claimed the commands showed node or VMI conditions, but the commands actually show status/list output. I corrected the comments to match what the commands do.

## Review Notes
- The post now aligns with current Harvester, KubeVirt, Longhorn, and Rancher Monitoring behavior, but PromQL examples can still vary slightly across chart versions and local relabeling choices.
