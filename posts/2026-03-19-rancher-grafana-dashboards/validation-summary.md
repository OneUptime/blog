# Validation Summary: How to Configure Grafana Dashboards in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Rancher Monitoring (`rancher-monitoring`)
- Grafana
- Prometheus
- Kubernetes
- Helm

## Sources Consulted
- Rancher RBAC for Monitoring: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/monitoring-and-alerting/rbac-for-monitoring
- Rancher Persistent Grafana Dashboards: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Rancher Helm Chart Options for Monitoring v2: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/helm-chart-options
- Rancher Monitoring and Alerting overview: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher chart source for `rancher-monitoring` values: https://github.com/rancher/charts/blob/dev-v2.13/charts/rancher-monitoring/107.2.0%2Bup69.8.2-rancher.20/values.yaml
- Rancher chart source for Grafana sidecar container wiring: https://github.com/rancher/charts/blob/dev-v2.13/charts/rancher-monitoring/107.2.0%2Bup69.8.2-rancher.20/charts/grafana/templates/_pod.tpl
- Grafana data sources docs: https://grafana.com/docs/grafana/latest/datasources/
- Grafana configuration docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/
- Grafana basic authentication docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/grafana/
- Grafana anonymous authentication docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/anonymous-auth/
- Grafana contact points docs: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/
- `kiwigrid/k8s-sidecar` README: https://github.com/kiwigrid/k8s-sidecar
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- Updated the Grafana access steps to match current Rancher navigation. The original version skipped the Rancher `Cluster Management > Explore` path documented for current Rancher releases and overstated the authentication behavior as an automatic Rancher-credential login.
- Updated the Grafana data-source navigation from `Configuration > Data Sources` to `Connections > Data sources` to match the current Grafana UI.
- Replaced the Helm configuration snippet in Step 6. The original snippet mixed in a Rancher proxy `root_url` example and `auth.proxy` settings that are not the current Rancher chart defaults, and the proxy URL example was incomplete for non-local clusters.
- Corrected the default dashboard sidecar namespace from `cattle-monitoring-system` to `cattle-dashboards`, which is what Rancher Monitoring uses for persisted dashboard ConfigMaps.
- Corrected the folder-organization guidance for provisioned dashboards. The original `grafana_folder` annotation was not the sidecar default, and the example namespace was wrong. I changed this to the documented `k8s-sidecar-target-directory` behavior and added the required `foldersFromFilesStructure` setting.
- Fixed the ConfigMap dashboard payload example so it no longer shows an invalid placeholder JSON structure. Provisioned dashboards should contain the copied dashboard JSON model directly.
- Updated the contact-point navigation and the alerting note so they align with current Grafana alerting UI terminology and Rancher Monitoring’s Alertmanager-based alert flow.
- Narrowed the anonymous-access guidance so it applies to directly exposed Grafana instances and does not imply that enabling Grafana anonymous auth bypasses Rancher UI access controls.

## Review Notes
- Rancher and Grafana UI labels are version-sensitive. Older Grafana versions may still show `Configuration > Data Sources`, while current documentation uses `Connections > Data sources`.
- Persistent dashboard behavior in Rancher changed when the dedicated `cattle-dashboards` namespace was introduced; this post is now aligned with current Rancher documentation and chart defaults.
- The local environment did not have `kubectl` installed, so command syntax was validated against the official Kubernetes command reference rather than local `--help` output.
