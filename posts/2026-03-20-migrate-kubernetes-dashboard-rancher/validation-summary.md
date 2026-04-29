# Validation Summary: How to Migrate from Kubernetes Dashboard to Rancher - Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Dashboard
- Rancher
- Kubernetes RBAC
- Helm
- cert-manager
- Prometheus and Grafana
- Fleet GitOps

## Sources Consulted
- Kubernetes Documentation: Deploy and Access the Kubernetes Dashboard — https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Rancher Documentation: Install/Upgrade Rancher on a Kubernetes Cluster — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/install-upgrade-on-a-kubernetes-cluster
- Rancher Documentation: Rancher Helm Chart Options — https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-references/helm-chart-options
- Rancher Documentation: Registering Existing Clusters — https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher Documentation: Cluster and Project Roles — https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher Documentation: API Reference — https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Rancher Documentation: Helm Charts and Apps — https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher Documentation: Enable Monitoring — https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Helm Documentation: helm uninstall — https://helm.sh/docs/helm/helm_uninstall/

## Issues Found

1. **The post understated current Kubernetes Dashboard behavior and omitted its current status.** The original text described Dashboard as a basic management UI without noting that the official Kubernetes docs now mark it as deprecated and unmaintained. The feature table also said Dashboard had no monitoring integration, which is inaccurate because Dashboard exposes a basic metrics view. I updated the introduction, the comparison table, and the conclusion to reflect current official behavior more accurately.

2. **The Rancher install example was incomplete for the chosen TLS mode.** The original Helm install used Rancher's Let's Encrypt settings without first installing `cert-manager`, which Rancher documents as required for Rancher-generated and Let's Encrypt certificates. I changed the install sequence to include the official `cert-manager` installation and simplified the Rancher install command to the documented default certificate flow.

3. **The imported-cluster step was missing the required privilege context.** Rancher documents that importing or registering an existing cluster requires `cluster-admin` privileges on the target cluster. I updated the import step to say the command should be run from a kubeconfig context with `cluster-admin` access.

4. **The RBAC migration section had multiple technical inaccuracies.** Kubernetes Dashboard currently supports bearer-token login, not a kubeconfig login flow as written. The Rancher API example also used the wrong resource shape by placing fields under `spec`, while the Rancher API reference defines `clusterName`, `roleTemplateName`, and `userPrincipalName` as top-level fields on `ClusterRoleTemplateBinding`. I corrected the authentication wording, updated the UI path, fixed the YAML structure, and switched the example to Rancher's default cluster role naming.

5. **The Dashboard removal step was outdated for current installs.** Current Kubernetes documentation says Dashboard supports Helm-based installation only. The post previously treated namespace deletion as the primary uninstall path and Helm uninstall as optional. I reversed that so the post now uses `helm uninstall` first and keeps namespace deletion as follow-up cleanup if needed.

6. **The Rancher cost visibility claim was too strong as written.** Rancher documents built-in monitoring, alerting, apps, and GitOps features, but not built-in cost visibility as a core default capability. I changed the comparison to say cost visibility is available via add-ons rather than stating it is natively present.

## Review Notes
- The example still uses `--set bootstrapPassword=admin`, which matches Rancher's own installation example style, but production deployments should use a unique secret.
- Rancher UI navigation varies somewhat across versions; the updated member-management path matches current Rancher documentation at review time.
- Kubernetes Dashboard is now deprecated and archived by the upstream project, so even a temporary side-by-side migration period should be kept short.
