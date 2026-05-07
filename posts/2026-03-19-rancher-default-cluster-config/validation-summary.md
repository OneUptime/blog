# Validation Summary: How to Set Default Cluster Configuration in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Manager
- Kubernetes
- RKE2 cluster provisioning
- Rancher cluster templates
- Pod Security Admission (PSA)
- Rancher Monitoring
- Project resource quotas

## Sources Consulted
- Rancher Cluster Templates: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/manage-cluster-templates
- Rancher cluster template example repository: https://github.com/rancher/cluster-template-examples
- Cluster template example `values.yaml`: https://raw.githubusercontent.com/rancher/cluster-template-examples/main/charts/values.yaml
- Cluster template example `cluster.yaml`: https://raw.githubusercontent.com/rancher/cluster-template-examples/main/charts/templates/cluster.yaml
- Cluster template example `managedcharts.yaml`: https://raw.githubusercontent.com/rancher/cluster-template-examples/main/charts/templates/managedcharts.yaml
- RKE2 Cluster Configuration Reference: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Pod Security Admission (PSA) Configuration Templates: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/psa-config-templates
- Sample PodSecurityConfiguration: https://ranchermanager.docs.rancher.com/reference-guides/rancher-security/psa-restricted-exemptions
- Project Resource Quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas
- How Resource Quotas Work in Rancher Projects: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Setting Container Default Resource Limits: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/set-container-default-resource-limits
- Enable Monitoring: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Monitoring Helm Chart Options: https://ranchermanager.docs.rancher.com/reference-guides/monitoring-v2-configuration/helm-chart-options
- Rancher Agents: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/launch-kubernetes-with-rancher/about-rancher-agents
- Rancher source for provisioning cluster fields: https://github.com/rancher/rancher/blob/main/pkg/apis/provisioning.cattle.io/v1/cluster_types.go
- Rancher source for cluster configuration fields: https://github.com/rancher/rancher/blob/main/pkg/apis/rke.cattle.io/v1/cluster_configuration_types.go
- Rancher source for shared RKE types: https://github.com/rancher/rancher/blob/main/pkg/apis/rke.cattle.io/v1/common_types.go

## Issues Found
- The post originally described Rancher cluster defaults as mostly `Global Settings` values. I corrected this to Rancher’s documented model: cluster templates and `provisioning.cattle.io/v1` cluster YAML for cluster-wide defaults, plus project-level settings for namespace defaults.
- Step 1 incorrectly used `v3/settings/k8s-version` as the general default Kubernetes version mechanism. I replaced it with `spec.kubernetesVersion` in the cluster template, which is the documented field for Rancher-provisioned RKE2/K3s clusters.
- Step 2 incorrectly used undocumented or misleading global setting endpoints for cluster CIDR, service CIDR, and cluster DNS. I replaced them with `rkeConfig.machineGlobalConfig` fields, which Rancher documents for cluster networking configuration.
- Step 3 used a raw Pod Security Admission config file and implied direct UI editing in the cluster create form. I changed it to Rancher’s supported PSA template workflow using `defaultPodSecurityAdmissionConfigurationTemplateName` and the Pod Security Admissions UI.
- Step 4 used RKE1-style etcd backup fields and unsupported global setting endpoints. I replaced them with the documented RKE2/K3s fields `rkeConfig.etcd.snapshotRetention` and `snapshotScheduleCron`.
- Step 5 implied that monitoring defaults are configured globally from Apps & Marketplace. I corrected this to the supported template-driven approach used by Rancher’s official cluster template example, including valid `rancher-monitoring` chart values.
- Step 6 incorrectly claimed that quotas set on the default project act as defaults for new projects, and it used a native `ResourceQuota` manifest in place of Rancher’s project quota workflow. I rewrote the section to use Rancher project Resource Quotas with `Project Limit` and `Namespace Default Limit`, and clarified their scope.
- Step 7 incorrectly used a Kubernetes `LimitRange` and claimed Rancher can set it as a cluster-wide default for new namespaces. I replaced this with Rancher’s documented `Container Default Resource Limit` behavior at the project level and clarified that propagation only applies to namespaces created afterward.
- Step 8 used `server-log-level`, which controls Rancher server logging rather than downstream cluster logging defaults. I replaced it with a documented audit logging example for RKE2 cluster configuration.
- Step 9 used an `agent-image` global setting example that does not match Rancher’s documented default-cluster configuration workflow. I replaced it with `agentEnvVars`, which Rancher documents for cluster agent and system agent configuration.
- Step 10 exported `/v3/settings`, which would not capture the template-based defaults described in the corrected post. I replaced it with exporting the Helm values baseline from Rancher’s official cluster template example repository.

## Review Notes
- The post is now technically aligned with Rancher’s current documented model for standardizing new clusters.
- The Kubernetes version example intentionally uses a placeholder because supported RKE2/K3s versions depend on the Rancher release support matrix.
- The monitoring example assumes you are using Rancher’s official cluster template example or a similar Helm-based cluster template workflow.
- Pod Security Admission configuration templates require Rancher v2.7.2 or later.
- The Step 10 export example assumes the `helm` CLI is installed on the machine where you are documenting the template defaults.
