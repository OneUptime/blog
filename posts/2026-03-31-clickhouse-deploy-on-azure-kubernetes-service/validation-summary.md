# Validation Summary: How to Deploy ClickHouse on Azure Kubernetes Service

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- ClickHouse (Altinity ClickHouse Operator)
- Azure Kubernetes Service (AKS)
- Azure CLI (`az`)
- Azure Managed Disk CSI driver (`disk.csi.azure.com`)
- Azure Workload Identity / OIDC
- Azure Blob Storage
- Azure Monitor / Container Insights
- Kubernetes StorageClass, PVC, node pools, taints/tolerations

## Sources Consulted
- Microsoft Learn — `az aks nodepool add`: https://learn.microsoft.com/en-us/cli/azure/aks/nodepool?view=azure-cli-latest
- Microsoft Learn — Ev5 VM series: https://learn.microsoft.com/en-us/azure/virtual-machines/sizes/memory-optimized/ev5-series
- Microsoft Learn — Azure Disk CSI driver: https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi
- Microsoft Learn — AKS Workload Identity: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn — Enable Monitoring for AKS: https://learn.microsoft.com/en-us/azure/azure-monitor/containers/kubernetes-monitoring-enable
- Altinity ClickHouse Operator: https://github.com/Altinity/clickhouse-operator
- Altinity Operator Docs: https://docs.altinity.com/altinitykubernetesoperator/

## Issues Found
- **Incorrect CLI flag names in `az aks nodepool add`**: the post used `--os-disk-type` and `--os-disk-size-gb`. Per the Microsoft Learn reference for `az aks nodepool add`, the correct flag names are `--node-osdisk-type` and `--node-osdisk-size`. Fixed in the node pool creation command.

## Review Notes
- The Altinity operator install bundle URL points to `master`, which will always install the latest (potentially breaking) operator version. For production, pinning to a specific release tag (e.g., `refs/tags/release-0.24.0`) is recommended.
- The ClickHouse image `clickhouse/clickhouse-server:24.3` pins to a minor tag rather than a full patch version; using a full version tag (e.g., `24.3.12.75`) is preferable for reproducibility.
- `shardsCount: 1` with `replicasCount: 2` yields a 2-replica single-shard cluster; ZooKeeper/ClickHouse Keeper is required for replicated tables but is not shown in the CHI manifest — the operator can manage Keeper separately via a `ClickHouseKeeperInstallation` or external Keeper/ZooKeeper.
- Workload Identity usage additionally requires annotating the ServiceAccount with the identity's client ID and labeling the pod with `azure.workload.identity/use: "true"`. The post shows the Azure side but not the Kubernetes-side wiring; this is a common next step beyond the snippet shown.
- Container Insights via the `monitoring` add-on is still supported but Azure now also offers the Azure Monitor managed Prometheus and the newer "Container insights with high log scale mode"; both are valid choices depending on requirements.
