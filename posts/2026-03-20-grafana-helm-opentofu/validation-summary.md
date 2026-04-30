# Validation Summary: How to Deploy Grafana with Helm and OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- Helm
- Kubernetes
- Grafana
- Grafana Generic OAuth
- Microsoft Entra ID / Azure AD OIDC
- Prometheus
- Loki
- Tempo

## Sources Consulted
- Grafana Helm installation docs: https://grafana.com/docs/grafana/latest/installation/helm/
- Grafana Generic OAuth docs: https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/generic-oauth/
- Grafana high-availability docs: https://grafana.com/docs/grafana/latest/setup-grafana/set-up-for-high-availability/
- Grafana chart metadata in the current community repo: https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/grafana/Chart.yaml
- Grafana chart values in the current community repo: https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/grafana/values.yaml
- Grafana chart README in the current community repo: https://raw.githubusercontent.com/grafana-community/helm-charts/main/charts/grafana/README.md
- Migration notice in the legacy `grafana/helm-charts` repo: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/grafana/README.md
- Grafana default configuration (`defaults.ini`): https://raw.githubusercontent.com/grafana/grafana/main/conf/defaults.ini
- Microsoft Entra ID UserInfo endpoint docs: https://learn.microsoft.com/en-us/entra/identity-platform/userinfo

## Issues Found
- The post used the old Helm repository URL and an outdated chart version. I updated the snippet from `https://grafana.github.io/helm-charts` / `7.3.0` to the current community chart repository and current chart version `12.3.0`, because Grafana's Helm chart has moved to `grafana-community/helm-charts`.
- The post set `replicas = 2` while relying on the default embedded Grafana database. That is not a correct high-availability setup. Grafana's official HA guidance requires a shared MySQL or Postgres database for multiple instances, so I changed the example to `replicas = 1` and added a clarifying comment.
- Step 2 claimed a labeled ConfigMap would be picked up by a sidecar, but the sidecar was not enabled in Step 1. I added `sidecar.dashboards.enabled` and aligned it with the `grafana_dashboard` label so the ConfigMap example matches the Helm configuration.
- The `dashboardProviders` comment said dashboards were being provisioned from ConfigMaps, but that block actually configures a file-based dashboard provider. I corrected the comment to match the mechanism being used.
- The snippet included a legacy `grafana_ini.alerting.enabled` block that no longer exists in current Grafana defaults. I removed it and kept `unified_alerting`, which is the current alerting subsystem.
- The Azure AD example implied group-based role mapping would work without qualification. I clarified that the IdP must include group claims for the `role_attribute_path` expression to work as written.

## Review Notes
- The chart version in the post is now current as of April 30, 2026, but Helm chart versions will continue to move; future reviews should re-check `Chart.yaml` in the community repo.
- The example `storageClass = "gp3"` is AWS-specific. It is technically valid, but readers on other platforms will need to substitute their own storage class.
- `helm`, `tofu`, and `terraform` binaries were not installed in this workspace, so the review was performed against official documentation and upstream chart/configuration sources rather than by executing the deployment locally.
