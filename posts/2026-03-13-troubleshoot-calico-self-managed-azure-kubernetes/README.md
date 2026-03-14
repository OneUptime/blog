# How to Troubleshoot Calico on Azure Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Troubleshooting, Azure, Self-Managed

Description: Diagnose and resolve common Calico installation issues on self-managed Kubernetes clusters running on Azure VMs.

---

## Introduction

Self-managed Kubernetes on Azure virtual machines with Calico requires navigating Azure-specific networking constraints that differ from EKS or GKE. Azure VNets, Network Security Groups (NSGs), and Azure's IP-in-IP protocol handling all affect how Calico operates.

The most common issues involve Azure NSGs blocking IPIP encapsulation (Azure restricts protocol 4 in many configurations), IP forwarding not being enabled on VMs, and Azure Load Balancer configurations interfering with service IP advertisement. Understanding these Azure-specific constraints is essential for effective troubleshooting.

## Prerequisites

- Self-managed Kubernetes on Azure VMs
- `kubectl` and `calicoctl` installed
- Azure CLI configured with permissions to manage VMs and NSGs
- Access to Azure Network Security Groups

## Step 1: Enable IP Forwarding on Azure VMs

Azure VMs require IP forwarding to be enabled at the Azure networking level.

```bash
# Enable IP forwarding on the VM's network interface
NIC_ID=$(az vm nic list \
  --resource-group <rg-name> \
  --vm-name <vm-name> \
  --query '[0].id' --output tsv)

az network nic update \
  --ids ${NIC_ID} \
  --ip-forwarding true

# Verify IP forwarding is enabled
az network nic show \
  --ids ${NIC_ID} \
  --query enableIPForwarding
```

## Step 2: Configure NSG Rules for Calico

Azure NSGs may block IPIP or VXLAN traffic needed by Calico.

```bash
# Get the NSG associated with your VM subnet
NSG_NAME=$(az network vnet subnet show \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --name <subnet-name> \
  --query networkSecurityGroup.id -o tsv | xargs -I{} az resource show --ids {} --query name -o tsv)

# Add rule to allow VXLAN (UDP 4789) - recommended over IPIP on Azure
az network nsg rule create \
  --resource-group <rg-name> \
  --nsg-name ${NSG_NAME} \
  --name AllowCalicovxlan \
  --priority 1000 \
  --protocol Udp \
  --destination-port-ranges 4789

# Add rule to allow Calico Typha (TCP 5473) for large clusters
az network nsg rule create \
  --resource-group <rg-name> \
  --nsg-name ${NSG_NAME} \
  --name AllowCalicoTypha \
  --priority 1001 \
  --protocol Tcp \
  --destination-port-ranges 5473
```

## Step 3: Switch from IPIP to VXLAN on Azure

Azure often blocks IPIP (protocol 4); switch to VXLAN as a workaround.

```bash
# Check current encapsulation mode
calicoctl get ippool -o yaml | grep -E "ipipMode:|vxlanMode:"

# Switch to VXLAN mode (Azure-friendly)
calicoctl patch ippool default-ipv4-ippool --type merge \
  --patch '{"spec":{"ipipMode":"Never","vxlanMode":"Always"}}'

# Restart Calico DaemonSet to apply the change
kubectl rollout restart daemonset -n kube-system calico-node

# Verify VXLAN interface is created on nodes
kubectl debug node/<node-name> -it --image=ubuntu -- ip link show vxlan.calico
```

## Step 4: Diagnose Pod Connectivity Failures

Investigate cross-node pod connectivity issues.

```bash
# Test basic cross-node pod connectivity
CALICO_POD=$(kubectl get pod -n kube-system -l k8s-app=calico-node \
  --field-selector spec.nodeName=<node-name> -o jsonpath='{.items[0].metadata.name}')

# Check Calico BGP/VXLAN peer status
calicoctl node status

# Check if VXLAN tunnels are established
kubectl debug node/<node-name> -it --image=ubuntu -- bridge fdb show dev vxlan.calico

# Capture VXLAN traffic to confirm encapsulation
kubectl debug node/<node-name> -it --image=ubuntu -- \
  tcpdump -i eth0 'udp port 4789' -c 10
```

## Step 5: Verify Azure Route Table Configuration

For BGP mode, Azure route tables may need manual configuration.

```bash
# Get the route table for the VM subnet
ROUTE_TABLE=$(az network vnet subnet show \
  --resource-group <rg-name> \
  --vnet-name <vnet-name> \
  --name <subnet-name> \
  --query routeTable.id -o tsv)

# Add routes for pod CIDRs to the Azure route table (for BGP mode)
az network route-table route create \
  --resource-group <rg-name> \
  --route-table-name <route-table-name> \
  --name pod-cidr-route \
  --address-prefix 10.244.0.0/16 \
  --next-hop-type VirtualAppliance \
  --next-hop-ip-address <kubernetes-node-ip>
```

## Best Practices

- Use VXLAN instead of IPIP on Azure to avoid protocol 4 restrictions
- Always enable IP forwarding at the Azure networking layer, not just in the OS
- Add NSG rules for Calico traffic before deploying the cluster
- Use Calico's Typha component for clusters with more than 50 nodes to reduce API server load
- Document all NSG rules required for Calico in your infrastructure-as-code

## Conclusion

Running Calico on self-managed Azure Kubernetes requires enabling IP forwarding at the Azure networking layer, configuring NSGs to allow Calico's traffic, and using VXLAN instead of IPIP to work within Azure's protocol restrictions. By addressing these Azure-specific requirements, you can run Calico reliably on Azure VMs.
