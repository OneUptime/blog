# Validation Summary: How to Configure Harvester Monitoring

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- Kubernetes
- Rancher Monitoring (`rancher-monitoring`)
- Prometheus
- Alertmanager
- Grafana
- KubeVirt
- Longhorn
- `kubectl`
- PromQL

## Sources Consulted
- Harvester Monitoring docs: https://docs.harvesterhci.io/v1.7/monitoring/harvester-monitoring/
- Harvester Add-ons docs: https://docs.harvesterhci.io/v1.7/advanced/addons/
- Harvester Configuration docs: https://docs.harvesterhci.io/v1.7/install/harvester-configuration/
- Harvester Add-on Development Guide: https://docs.harvesterhci.io/v1.7/developer/Add-on-development-guide/
- Prometheus storage docs: https://prometheus.io/docs/prometheus/latest/storage/
- Alertmanager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator alerting docs: https://prometheus-operator.dev/docs/developer/alerting/
- KubeVirt metrics reference: https://kubevirt.io/monitoring/metrics.html
- Longhorn metrics reference: https://longhorn.io/docs/latest/monitoring/metrics/
- Rancher Monitoring chart values: https://github.com/rancher/charts/blob/main/charts/rancher-monitoring/values.yaml
- Rancher Monitoring Alertmanager templates: https://github.com/rancher/charts/blob/main/charts/rancher-monitoring/templates/alertmanager/alertmanager.yaml
- Rancher Monitoring Alertmanager secret template: https://github.com/rancher/charts/blob/main/charts/rancher-monitoring/templates/alertmanager/secret.yaml

## Issues Found
- The UI workflow was outdated. The post used `Advanced -> Monitoring & Logging`, but current Harvester versions manage monitoring as the `rancher-monitoring` add-on under `Advanced -> Add-ons`. I updated the enablement steps accordingly.
- The `harvester-monitoring` `Setting` resource was from the older pre-add-on model and is not the current configuration path. I replaced it with the current `addons.harvesterhci.io` workflow and a valid `spec.valuesContent` example.
- The post suggested installing monitoring with a standalone Helm install for Harvester's built-in stack. I replaced that with enabling and editing the built-in `rancher-monitoring` add-on, which is the documented Harvester path.
- `retentionSize: 50GiB` was invalid for Prometheus. Prometheus retention size uses `B`, `KB`, `MB`, `GB`, `TB`, `PB`, or `EB`, so I corrected it to `50GB`.
- The Grafana login section implied fetching the password from a secret instead of using Harvester's documented default Grafana admin password. I corrected it to `admin / prom-operator`.
- The custom Grafana dashboard example used the wrong namespace. The current Rancher Monitoring chart watches `grafana_dashboard` ConfigMaps in `cattle-dashboards`, not `cattle-monitoring-system`, so I fixed the namespace and kept the label.
- The post claimed `Node Exporter Full` and a Longhorn dashboard as pre-built defaults. I changed the section to the built-in views that are actually documented or present by default, and clarified when custom panels are needed.
- The Longhorn alert rules were incorrect. `longhorn_volume_robustness` is exposed as a gauge with a `state` label, not a numeric enum value of `2` or `3`. I changed the rules to `state="degraded"` and `state="faulted"` checks.
- The Longhorn IOPS queries were incorrect because `longhorn_volume_read_iops` and `longhorn_volume_write_iops` are gauges, not counters. I removed `rate()` and changed them to direct aggregation.
- The VM memory query was incorrect because it divided used memory by available memory. I changed it to use `(1 - available/domain) * 100`, which matches Harvester's documented memory usage calculation model.
- The `PrometheusRule` verification command depended on a `status:` block that is not a reliable validation method for this resource. I changed it to `kubectl get` and `kubectl describe`.
- The Alertmanager routing example used the legacy `match` syntax. I updated it to `matchers`, which is the current configuration style documented by Alertmanager.

## Review Notes
- Harvester documentation states that monitoring is implemented as the `rancher-monitoring` add-on as of Harvester `v1.2.0`, and it is disabled by default in new installations.
- Harvester documentation also notes that clusters upgraded from `v1.1.x` keep monitoring enabled after conversion to the add-on model.
- The dashboard namespace, datasource name, and several default values in this post depend on the current Rancher Monitoring chart. Those details should be revalidated if the bundled chart version changes in a future Harvester release.
