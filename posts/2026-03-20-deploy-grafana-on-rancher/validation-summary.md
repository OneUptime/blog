# Validation Summary: How to Deploy Grafana on Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana (standalone deployment)
- Rancher / Kubernetes
- Helm (Grafana official Helm chart)
- Longhorn (storage class)
- NGINX Ingress + cert-manager
- Prometheus, Loki, Tempo (data sources)
- LDAP authentication
- Slack alert notifier provisioning

## Sources Consulted
- Grafana Helm chart repository and values reference: https://github.com/grafana/helm-charts/tree/main/charts/grafana
- Grafana provisioning documentation (datasources, dashboards, notifiers): https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana LDAP authentication documentation: https://grafana.com/docs/grafana/latest/setup-grafana/configure-security/configure-authentication/ldap/
- grafana.com dashboard catalog (IDs 7249 "Kubernetes Cluster (Prometheus)" and 1860 "Node Exporter Full")
- Tempo Helm chart default service port (3100 for the single-binary `tempo` chart)
- cert-manager ClusterIssuer annotation reference

## Issues Found
No technical issues found.

## Review Notes
- The `grafana-worldmap-panel` plugin is deprecated; the Geomap panel (built into core Grafana since 8.1) is the recommended replacement. The plugin is still installable, so this is not a breaking issue.
- The `grafana-piechart-panel` external plugin is also legacy — the pie chart panel is included in core Grafana 8+. Installing it still works but is no longer required.
- The `notifiers:` provisioning block in Step 3 uses Grafana's **legacy alerting** schema. In Grafana 9+ unified alerting is the default; provisioning contact points uses the `alerting:` / `contactPoints` schema. The legacy format remains supported when legacy alerting is explicitly enabled, but for a fresh deployment users should consider migrating to unified alerting contact points.
- The Tempo URL on port 3100 matches the default service port of the standalone `tempo` Helm chart. If using `tempo-distributed`, the equivalent endpoint is the query-frontend service (also commonly 3100). No change needed.
- `adminPassword: "securepassword"` is illustrative; in production users should source the admin credentials from an existing secret via `admin.existingSecret`.
