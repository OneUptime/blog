# Tune Calico on Self-Managed Azure Kubernetes for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Performance, Tuning, Azure, Self-Managed

Description: A step-by-step guide to tuning Calico networking on self-managed Kubernetes clusters running on Azure VMs, optimizing MTU, IPAM, and routing for Azure VNet-aware production deployments.

---

## Introduction

Self-managed Kubernetes clusters on Azure give operators full control over their networking stack. When running Calico in this environment, understanding Azure's VNet networking model is critical to making the right tuning decisions. Azure VMs communicate over VNets with an effective MTU of 1500 bytes by default, though supported VM network interfaces can be configured for larger MTUs on traffic that stays within the virtual network or directly peered virtual networks in the same region.

Unlike AKS, self-managed Azure Kubernetes clusters don't benefit from managed CNI integration, so you must configure Calico explicitly to work within Azure's routing constraints. This includes deciding between VXLAN overlay and direct routing, configuring appropriate IP pools, and tuning Felix to handle Azure-specific network behaviors.

This guide provides practical tuning steps for Calico on self-managed Azure Kubernetes, covering network overlay selection, MTU configuration, IPAM optimization, and Felix parameter tuning for production workloads.

## Prerequisites

- Self-managed Kubernetes cluster on Azure VMs (kubeadm or similar)
- Calico v3.x installed via manifest or Helm
- `calicoctl` v3.x configured
- Azure CLI (`az`) with contributor access
- `kubectl` with cluster-admin permissions

## Step 1: Check Azure Accelerated Networking and MTU

Azure Accelerated Networking enables SR-IOV and increases effective throughput. Check whether it's enabled, but treat MTU as a separate setting: the Azure default is still 1500 unless you explicitly configure and test a larger MTU on supported VM network interfaces and network paths.

```bash
# Check if accelerated networking is enabled on Azure VMs

az network nic show --resource-group <rg-name> --name <nic-name> \
  --query "enableAcceleratedNetworking"

# Check current MTU on the primary network interface
ip link show eth0 | grep mtu
```

Set the Calico MTU based on your Azure network configuration:

```bash
# For standard Azure networking (MTU 1500), use 1450 for IPv4 VXLAN (50 byte overhead)
calicoctl patch felixconfiguration default \
  --patch='{"spec": {"vxlanMTU": 1450}}'
```

## Step 2: Configure VXLAN Overlay for Azure VNet Compatibility

Azure VNet does not automatically learn Calico pod CIDRs through BGP. Direct routing requires additional Azure route table or network appliance configuration, so VXLAN is a common overlay choice for self-managed Azure clusters.

```yaml
# Configure IPPool with VXLAN overlay for Azure VNet compatibility
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: azure-vxlan-pool
spec:
  cidr: 10.244.0.0/16
  # Use VXLAN for encapsulation - compatible with Azure VNet routing
  ipipMode: Never
  vxlanMode: Always
  natOutgoing: true
  # Block size of 26 provides 64 addresses per node
  blockSize: 26
  nodeSelector: all()
```

## Step 3: Optimize IPAM for Azure Availability Zones

Assign IP blocks to nodes within the same Azure availability zone when you want pod address ranges to align with zone topology for operations, route planning, or observability. IP pool selection alone does not minimize cross-zone traffic; use Kubernetes scheduling and topology controls for workload placement.

```bash
# Label nodes with their Azure availability zone
kubectl label node <node-name> topology.kubernetes.io/zone=eastus-1

# Verify node labels are applied
kubectl get nodes --show-labels | grep topology.kubernetes.io/zone
```

Create zone-specific IP pools to align pod addressing with Azure AZ topology:

```yaml
# IP pool for nodes in Azure zone 1
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: azure-zone1-pool
spec:
  cidr: 10.244.0.0/18
  vxlanMode: Always
  ipipMode: Never
  natOutgoing: true
  # Only assign this pool to nodes in zone 1
  nodeSelector: "topology.kubernetes.io/zone == 'eastus-1'"
```

## Step 4: Tune Felix for Azure Network Characteristics

Other iptables managers or host firewall tooling can affect Felix's iptables management. Tune Felix only when you have a measured need to change the defaults.

```bash
# Apply Azure-optimized Felix configuration
calicoctl patch felixconfiguration default --patch='{
  "spec": {
    "iptablesRefreshInterval": "90s",
    "routeRefreshInterval": "90s",
    "ipv6Support": false,
    "iptablesBackend": "Auto",
    "usageReportingEnabled": false
  }
}'
```

## Step 5: Configure Azure NSG Rules for Calico

Azure Network Security Groups must allow Calico's required ports for proper operation.

```bash
# Allow VXLAN traffic between nodes (UDP 4789)
az network nsg rule create \
  --resource-group <rg-name> \
  --nsg-name <nsg-name> \
  --name allow-calico-vxlan \
  --protocol Udp \
  --direction Inbound \
  --priority 1000 \
  --source-address-prefixes VirtualNetwork \
  --destination-port-ranges 4789 \
  --access Allow

# Allow Typha communication (TCP 5473)
az network nsg rule create \
  --resource-group <rg-name> \
  --nsg-name <nsg-name> \
  --name allow-calico-typha \
  --protocol Tcp \
  --direction Inbound \
  --priority 1010 \
  --source-address-prefixes VirtualNetwork \
  --destination-port-ranges 5473 \
  --access Allow
```

## Best Practices

- Use VXLAN mode rather than IPIP for Azure overlays - VXLAN is supported in environments where IPIP is not, including Azure
- Enable Typha for clusters with more than 50 nodes to reduce API server load
- Configure Azure NSGs before installing Calico to avoid connectivity gaps
- Monitor Calico node pod logs for VXLAN tunnel errors on Azure
- Use managed disks with premium SSD for etcd nodes to avoid network-storage contention
- Test Azure accelerated networking before enabling - it can affect MTU expectations

## Conclusion

Tuning Calico on self-managed Azure Kubernetes clusters requires aligning your network configuration with Azure's VNet model. By using VXLAN overlay, configuring correct MTU values, optimizing IPAM for availability zones, and setting appropriate Azure NSG rules, you can run a stable and high-performance Calico deployment that meets production requirements on Azure infrastructure.
