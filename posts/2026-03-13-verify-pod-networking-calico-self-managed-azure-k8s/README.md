# Verify Pod Networking with Calico on Self-Managed Azure Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Azure, Pod Networking, Self-Managed

Description: Learn how to verify Calico pod networking on a self-managed Kubernetes cluster running on Azure VMs, including NSG configuration, VXLAN mode requirements, and cross-node connectivity validation.

---

## Introduction

Running a self-managed Kubernetes cluster on Azure VMs with Calico requires specific configuration due to Azure's network filtering policies. Most importantly, Azure Virtual Networks filter IP-in-IP (protocol 4) traffic, making VXLAN the required encapsulation mode for overlay networking. Failing to configure VXLAN mode is the most common cause of cross-node pod connectivity failures in Azure deployments.

Azure Network Security Groups (NSGs) must also be configured to allow VXLAN traffic (UDP 4789) and BGP traffic (TCP 179) between nodes. Without these rules, pods on different nodes will be unable to communicate even if Calico is correctly configured.

This guide covers the complete verification workflow for Calico pod networking on self-managed Azure Kubernetes.

## Prerequisites

- Self-managed Kubernetes cluster on Azure VMs
- Calico installed in VXLAN mode
- Azure CLI configured
- `calicoctl` CLI configured
- `kubectl` with cluster admin access

## Step 1: Verify Calico Is Configured for VXLAN Mode

Azure blocks IP-in-IP traffic, so VXLAN mode is mandatory.

```bash
# Check the IP pool encapsulation mode
calicoctl get ippool default-ipv4-ippool -o yaml | grep -E "ipipMode|vxlanMode"
```

```yaml
# ippool-azure-vxlan.yaml — Azure-compatible IP pool with VXLAN
apiVersion: projectcalico.org/v3
kind: IPPool
metadata:
  name: default-ipv4-ippool
spec:
  cidr: 192.168.0.0/16
  # IPIP must be Never on Azure (protocol 4 is filtered)
  ipipMode: Never
  # VXLAN is required on Azure
  vxlanMode: Always
  natOutgoing: true
  disabled: false
```

```bash
# Apply VXLAN mode if not already configured
calicoctl apply -f ippool-azure-vxlan.yaml

# Verify the change
calicoctl get ippool -o yaml | grep -E "ipipMode|vxlanMode"
```

## Step 2: Check Azure NSG Rules for VXLAN Traffic

Verify that Network Security Group rules allow VXLAN traffic between nodes.

```bash
# Get the NSG name for the VM subnet
az network nsg list --resource-group <rg-name> --query '[*].name' -o tsv

# Check existing NSG rules
NSG_NAME=<nsg-name>
az network nsg rule list --nsg-name $NSG_NAME --resource-group <rg-name> -o table

# Add VXLAN inbound rule if missing (allow UDP 4789 from VNet)
az network nsg rule create \
  --nsg-name $NSG_NAME \
  --resource-group <rg-name> \
  --name allow-vxlan-calico \
  --priority 1100 \
  --direction Inbound \
  --access Allow \
  --protocol Udp \
  --destination-port-ranges 4789 \
  --source-address-prefixes VirtualNetwork
```

## Step 3: Verify Calico VXLAN Interface on Nodes

Confirm that Calico has created the VXLAN tunnel interface on all nodes.

```bash
# Check all Calico pods are running
kubectl get pods -n kube-system -l k8s-app=calico-node -o wide

# Verify the VXLAN interface (vxlan.calico) exists on a node
kubectl debug node/<node-name> -it --image=ubuntu -- ip link show vxlan.calico

# Confirm the VXLAN interface is UP with correct settings
kubectl debug node/<node-name> -it --image=ubuntu -- ip -d link show vxlan.calico | grep "vxlan id"
```

## Step 4: Test Cross-Node Pod Connectivity

Validate pod-to-pod connectivity between Azure VMs.

```bash
# Deploy pods on two different Azure VMs
kubectl run pod-a --image=busybox:1.28 \
  --overrides='{"spec":{"nodeName":"<azure-vm-1>"}}' \
  --restart=Never -- sleep 3600

kubectl run pod-b --image=busybox:1.28 \
  --overrides='{"spec":{"nodeName":"<azure-vm-2>"}}' \
  --restart=Never -- sleep 3600

# Get Pod B's IP
POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')

# Test ICMP connectivity (should work with VXLAN)
kubectl exec pod-a -- ping -c 5 $POD_B_IP

# Verify the traffic uses VXLAN encapsulation
# On azure-vm-1, capture UDP 4789 traffic while ping runs
```

## Step 5: Validate DNS and Service Connectivity

Test Kubernetes service resolution and connectivity from pods.

```bash
# Test DNS resolution
kubectl exec pod-a -- nslookup kubernetes.default.svc.cluster.local

# Test connectivity to the Kubernetes API service
KUBE_SVC_IP=$(kubectl get svc kubernetes -o jsonpath='{.spec.clusterIP}')
kubectl exec pod-a -- nc -zv $KUBE_SVC_IP 443

# Verify external connectivity works through NAT
kubectl exec pod-a -- wget -qO- --timeout=5 http://checkip.amazonaws.com
```

## Best Practices

- Always use `vxlanMode: Always` and `ipipMode: Never` for Calico on Azure
- Check Azure NSG rules early in troubleshooting — they are the most common cause of failures
- Avoid enabling BGP mode on Azure without careful testing as it requires additional NSG rules
- Use Calico's built-in connectivity test after any NSG rule changes
- Monitor VXLAN tunnel interface status as part of your node health checks

## Conclusion

Verifying Calico pod networking on self-managed Azure Kubernetes requires confirming VXLAN mode is configured (never IPIP on Azure), NSG rules permit VXLAN traffic, and actual cross-node pod connectivity works end-to-end. Azure's network filtering is more restrictive than AWS or GCP, making proper VXLAN configuration essential. These validation steps should be part of every new node provisioning procedure in your Azure Kubernetes environment.
