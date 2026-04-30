# Validation Summary: How to Configure Harvester Monitoring - Setup

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Harvester
- Rancher Monitoring (`rancher-monitoring`)
- Prometheus
- Alertmanager
- Grafana
- Kubernetes
- Longhorn
- KubeVirt
- Helm charts

## Sources Consulted
- Harvester documentation, "Monitoring": https://docs.harvesterhci.io/v1.7/monitoring/harvester-monitoring/
- Rancher documentation, "Monitoring Configuration Guides": https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides
- Rancher documentation, "Prometheus Configuration": https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Rancher documentation, "Monitoring Best Practices": https://ranchermanager.docs.rancher.com/reference-guides/best-practices/rancher-managed-clusters/monitoring-best-practices
- Rancher monitoring chart values (`107.2.2+up69.8.2-rancher.26`): https://raw.githubusercontent.com/rancher/charts/dev-v2.12/charts/rancher-monitoring/107.2.2+up69.8.2-rancher.26/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator documentation, "Alerting Routes": https://prometheus-operator.dev/docs/developer/alerting/
- Grafana documentation, "Import dashboards": https://grafana.com/docs/grafana/latest/dashboards/export-import/
- Grafana documentation, "Dashboard HTTP API": https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- Longhorn documentation, "Setting up Prometheus and Grafana to monitor Longhorn": https://longhorn.io/docs/latest/monitoring/prometheus-and-grafana-setup/
- Grafana dashboard library, "Longhorn Example v1.4.0" (`17626`): https://grafana.com/grafana/dashboards/17626
- Grafana dashboard library, "Node Exporter Full" (`1860`): https://grafana.com/grafana/dashboards/1860
- Grafana dashboard library, "KubeVirt VM Info" (`11748`): https://grafana.com/grafana/dashboards/11748

## Issues Found
- The post pointed readers to the wrong Harvester UI path and an unsupported manual Helm install flow. Current Harvester documentation manages monitoring as the `rancher-monitoring` add-on under `Advanced > Addons`, or via `kubectl edit addons.harvesterhci.io`. I updated Step 1 to use the supported add-on workflow.
- The Prometheus retention example patched the live Prometheus custom resource directly. Rancher documents direct CR edits as an advanced path, while Harvester documents persistent configuration through the add-on `spec.valuesContent`. I replaced the patch example with the supported add-on values snippet and kept retention, retention size, and storage settings together.
- The `AlertmanagerConfig` example used outdated route matching syntax. Current Prometheus Operator schemas use `matchers`, not `match`, and the operator enforces namespace matching on first-level routes. I updated the route syntax, switched PagerDuty to `routingKey` for Events API v2, and clarified that the config should be created in the namespace whose alerts you want to route.
- The Grafana note claimed a specific built-in `Harvester` folder that I could not verify from official Harvester documentation. I replaced that with the documented Grafana link exposed from Harvester’s Dashboard page.
- The dashboard import example used an undocumented `/api/dashboards/import` call, and two listed dashboard IDs were incorrect: `17119` is `Kubernetes EKS Cluster (Prometheus)`, not `Harvester Overview`, and `12006` is `Kubernetes apiserver`, not `KubeVirt VMs`. I replaced the API example with Grafana’s documented UI import flow and corrected the optional dashboard list to `17626`, `1860`, and `11748`.
- The best-practices guidance suggested that 30-90 day retention is typical. Rancher’s monitoring best-practices guidance explicitly cautions that Prometheus is not intended for long-term metrics retention. I rewrote that recommendation to focus on sizing retention and storage based on metric volume and disk capacity.

## Review Notes
- Harvester v1.7 documents monitoring as an add-on that is disabled by default in new installations, while upgraded older clusters may already have it enabled.
- `AlertmanagerConfig` resources are namespace-scoped in practice because the operator injects namespace matchers into first-level routes. Readers who want broad coverage may need multiple configs across namespaces.
- The additional dashboard IDs are community dashboards published through Grafana.com. They are reasonable optional imports, but compatibility can vary with the exact Harvester, Longhorn, and KubeVirt metric labels exposed in a given release.
