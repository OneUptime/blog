# Validation Summary: How to Set Up Kubernetes Node Auto-Repair and Auto-Upgrade

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes node management
- Google Kubernetes Engine (GKE)
- Amazon EKS managed node groups
- Azure Kubernetes Service (AKS)
- Terraform providers for Google Cloud, AWS, and Azure
- Node Problem Detector
- Cluster Autoscaler
- Draino
- Kured
- Prometheus and kube-state-metrics

## Sources Consulted
- GKE node auto-repair documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/node-auto-repair
- GKE node auto-upgrade documentation: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/node-auto-upgrades
- GKE maintenance windows and exclusions: https://docs.cloud.google.com/kubernetes-engine/docs/how-to/maintenance-windows-and-exclusions
- GKE release channels documentation: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/release-channels
- Amazon EKS automatic node repair documentation: https://docs.aws.amazon.com/eks/latest/userguide/node-repair.html
- Amazon EKS managed node group update documentation: https://docs.aws.amazon.com/eks/latest/userguide/update-managed-node-group.html
- eksctl node repair configuration documentation: https://docs.aws.amazon.com/eks/latest/eksctl/nodegroup-node-repair-config.html
- AWS provider `aws_eks_node_group` Terraform Registry documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_node_group
- AKS planned maintenance documentation: https://learn.microsoft.com/en-us/azure/aks/planned-maintenance
- AzureRM provider `azurerm_kubernetes_cluster` Terraform Registry documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/kubernetes_cluster
- Kubernetes node health monitoring documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/monitor-node-health/
- Node Problem Detector releases and configuration: https://github.com/kubernetes/node-problem-detector
- Amazon EKS Cluster Autoscaler best practices: https://docs.aws.amazon.com/eks/latest/best-practices/cas.html
- Kubernetes autoscaler releases: https://github.com/kubernetes/autoscaler/releases
- Draino project README and manifest: https://github.com/planetlabs/draino
- Kured installation and configuration documentation: https://kured.dev/docs/installation/ and https://kured.dev/docs/configuration/
- Kubernetes drain documentation: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/

## Issues Found
- Updated example GKE and AKS maintenance dates from past 2024 dates to future 2026 dates so the examples do not use stale schedule/exclusion values.
- Corrected the EKS managed node group example from implying automatic upgrades at creation time to showing node auto-repair with `--enable-node-repair`, and clarified that managed node group upgrades are initiated separately.
- Added `node_repair_config { enabled = true }` to the Terraform EKS managed node group example and corrected the `force_update_version` comment to reflect its real behavior around forced updates when drains are blocked.
- Renamed the EKS add-on "auto-update" wording because the Terraform data source selects the latest compatible add-on version during plan/apply; it does not make EKS update the add-on independently.
- Replaced the AKS maintenance command with the current `az aks maintenanceconfiguration add` form and the `aksManagedAutoUpgradeSchedule` maintenance configuration name used for cluster auto-upgrades.
- Updated the AKS Terraform example to current AzureRM field names: `automatic_upgrade_channel`, `node_os_upgrade_channel`, `maintenance_window_auto_upgrade`, and `maintenance_window_node_os`.
- Updated Node Problem Detector, Cluster Autoscaler, and Kured image examples to current supported versions or version-matched examples.
- Fixed the Draino install URL from the nonexistent `manifest/draino.yaml` path to the project `manifest.yml`, changed the image away from `latest`, and corrected node conditions to positional arguments instead of a nonexistent `--node-conditions` flag.
- Replaced deprecated Kured Slack flags with `--notify-url`.
- Replaced non-standard Prometheus metrics such as `node_auto_repair_total`, `node_replacement_total`, `kube_node_created_bucket`, and `kube_audit_events` with metrics from kube-state-metrics and Draino that match the examples in the post.

## Review Notes
The examples are still illustrative and require environment-specific supporting resources such as IAM roles, service accounts, RBAC, Terraform provider configuration, and monitoring stack configuration. Cluster Autoscaler image tags should always be matched to the target Kubernetes minor version.
