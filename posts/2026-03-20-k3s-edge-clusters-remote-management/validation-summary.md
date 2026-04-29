# Validation Summary: How to Manage K3s Edge Clusters Remotely

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Rancher
- Fleet
- GitOps
- Kubernetes
- Rancher Monitoring

## Sources Consulted
- Rancher: Registering Existing Clusters - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher: Kubeconfigs - https://ranchermanager.docs.rancher.com/api/workflows/kubeconfigs
- Rancher: Access a Cluster with Kubectl and kubeconfig - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Rancher: Communicating with Downstream User Clusters - https://ranchermanager.docs.rancher.com/v2.13/reference-guides/rancher-manager-architecture/communicating-with-downstream-user-clusters
- Rancher: Best Practices for Disconnected Clusters - https://ranchermanager.docs.rancher.com/v2.11/reference-guides/best-practices/rancher-managed-clusters/disconnected-clusters
- Rancher: Enable Monitoring - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher: Configuring PrometheusRules - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheusrules
- Rancher: Rancher is No Longer Needed - https://ranchermanager.docs.rancher.com/v2.12/faq/rancher-is-no-longer-needed
- Fleet: Mapping to Downstream Clusters - https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Fleet: GitRepo Resource - https://fleet.rancher.io/0.13/reference/ref-gitrepo
- Fleet: Cluster Registration Internals - https://fleet.rancher.io/0.12/reference/ref-registration
- Fleet: Status Fields - https://fleet.rancher.io/ref-status-fields
- Fleet: Troubleshooting - https://fleet.rancher.io/troubleshooting
- K3s: Quick-Start Guide - https://docs.k3s.io/quick-start
- Kubernetes kube-state-metrics: Node Metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md

## Issues Found
- The architecture and Step 3 implied that Fleet agents pull directly from Git and that deployments keep syncing while disconnected. I corrected this to reflect Fleet's actual model: the management cluster polls Git and downstream agents apply BundleDeployments after reconnecting.
- Step 1 used an incorrect verification command (`kubectl get cluster -n fleet-default`). I replaced it with the Rancher management resource that is documented for listing Rancher-managed clusters.
- Step 2 used an imprecise Fleet verification flow and a likely incorrect `bundle` check in `fleet-local`. I replaced it with agent verification on the downstream cluster and Fleet cluster check-in on the management cluster.
- Step 4 used an unsupported/non-documented Rancher CLI example (`rancher context switch edge-cluster-1`). I changed it to the documented kubeconfig workflow and the interactive `rancher context switch` flow.
- Step 5 implied monitoring data and an alert rule were immediately available without enabling Rancher Monitoring, and the YAML snippet was not a valid Rancher monitoring resource. I changed this to the documented monitoring setup flow and a doc-backed PromQL example using `kube_node_status_condition`.
- Step 6 recommended editing a K3s systemd override for restart behavior even though the official K3s install already configures the service to restart automatically. I replaced that with verification and log-inspection commands.
- Step 7 suggested manually applying an upgrade `Plan` as if that were the Rancher-managed path for imported K3s clusters. I corrected this to Rancher's version-management workflow and noted that disabled version management means upgrades must be managed independently.
- Step 8 used `forceSyncGeneration: 1` as a fixed value. I corrected the guidance to explain that the field must be incremented for each forced redeploy.
- The final best-practices note implied any Rancher-down scenario could still be handled with the Rancher-generated kubeconfig alone. I corrected this to require ACE or the cluster's native K3s kubeconfig for direct access when Rancher is unavailable.

## Review Notes
- Rancher-generated kubeconfigs use the Rancher authentication proxy by default; direct access for registered K3s clusters requires an Authorized Cluster Endpoint context or the cluster's original K3s kubeconfig.
- Imported K3s version management in Rancher is version-sensitive: when enabled, Rancher manages system-upgrade-controller resources for the cluster, so out-of-band upgrades can cause conflicts.
- While disconnected edge clusters keep running their last applied workloads, Rancher management operations are unavailable until connectivity is restored.
