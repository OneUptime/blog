# Validation Summary: How to Configure Azure Availability Zones with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Azure (Virtual Network, NSG, Load Balancer, Public IP, VM, VMSS, Managed Disks)
- Azure CLI (`az`)
- Kubernetes (topology spread constraints, StorageClass, kubectl)
- Azure Disk CSI driver (`disk.csi.azure.com`)
- talosctl (config generation with JSON patches)

## Sources Consulted
- Azure CLI reference: [`az network nsg rule`](https://learn.microsoft.com/en-us/cli/azure/network/nsg/rule)
- Azure CLI reference: [`az network public-ip`](https://learn.microsoft.com/en-us/cli/azure/network/public-ip)
- Azure CLI reference: [`az network lb`](https://learn.microsoft.com/en-us/cli/azure/network/lb)
- Azure CLI reference: [`az network nic ip-config`](https://learn.microsoft.com/en-us/cli/azure/network/nic/ip-config)
- Azure CLI reference: [`az vm create`](https://learn.microsoft.com/en-us/cli/azure/vm) and [`az vmss create`](https://learn.microsoft.com/en-us/cli/azure/vmss)
- Azure Disk CSI driver SKUs: [AKS Azure Disk CSI](https://learn.microsoft.com/en-us/azure/aks/azure-disk-csi)
- Azure Availability Zones: [AKS reliability / Availability Zones](https://learn.microsoft.com/en-us/azure/aks/reliability-availability-zones-configure)
- Per-subscription zone peering: Azure `checkZonePeers` API
- Talos configuration patches: [Talos docs - patching](https://www.talos.dev/v1.9/talos-guides/configuration/patching/)
- Kubernetes topology spread constraints: [k8s.io docs](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/)

## Issues Found
1. **`az network nsg rule create` parameter name** — The post used `--destination-port-range` (singular). Microsoft Learn documents only `--destination-port-ranges` (plural). Changed both occurrences (k8s-api rule and talos-api rule) to use the plural form for forward-compatibility, since the singular variant relies on Azure CLI prefix-matching which is not guaranteed across CLI versions.
2. **`az vmss create --upgrade-policy-mode` casing** — The post used lowercase `manual`. The accepted enum values per Azure CLI documentation are PascalCase: `Automatic`, `Manual`, `Rolling`. Changed `manual` → `Manual`.

## Review Notes
- The `az network nic ip-config update --ids "${NIC_ID}/ipConfigurations/ipconfig1"` pattern is valid: appending `/ipConfigurations/<name>` to a NIC resource ID produces a fully-qualified IP config resource ID that `--ids` (a global Azure CLI parameter) accepts and parses into its constituent named parameters.
- The image name `talos-v1.7.0` in the `az vm create` / `az vmss create` calls is illustrative; in practice users must upload a Talos VHD as a managed image or use a Shared Image Gallery reference. The post is about zone configuration rather than Talos image preparation, so the placeholder is appropriate.
- The `talosctl gen config --config-patch` JSON Patch (RFC 6902) syntax is valid and supported. Note: `--config-patch` applies to both control plane and worker configs; configuring `cluster.externalCloudProvider` on workers is harmless but `--config-patch-control-plane` would be a more precise choice for control-plane-only fields.
- Both the NSG-on-NIC (via `--nsg` on `az vm create`/`az vmss create`) and the NSG-on-subnet associations are configured; this results in two layers of NSG evaluation. This is intentional in many setups but worth being aware of when troubleshooting connectivity.
- `Premium_ZRS` (Premium SSD ZRS) is only available in select regions and only for managed disks in zonal regions — readers in unsupported regions will need `StandardSSD_ZRS` or fall back to `Premium_LRS`.
- The zone label format `eastus-1` used in the `kubectl get nodes -l topology.kubernetes.io/zone=eastus-1` example is the standard format applied by the Azure cloud-controller-manager (`<region>-<zoneNumber>`).
- A 3-node etcd quorum tolerating one zone failure (described in the "Handling Zone Failures" section) is accurate (quorum = floor(N/2) + 1 = 2 of 3).
