# Install Cilium on Broadcom VMware ESXi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, VMware, NSX, eBPF

Description: Guide to installing Cilium on Kubernetes clusters running on VMware ESXi or vSphere infrastructure for on-premises eBPF networking.

---

## Introduction

Running Kubernetes on VMware ESXi or vSphere is common in enterprise on-premises environments. Cilium works well on VMware-hosted Kubernetes clusters, though it requires specific configuration for vSphere's networking model. Unlike cloud environments with ENI or native CNI integrations, VMware-hosted clusters commonly use an overlay CNI such as VXLAN or Geneve for pod networking.

This guide covers installing Cilium on Kubernetes clusters running on VMware ESXi virtual machines using kubeadm, with VXLAN encapsulation for cross-node pod communication.

## Prerequisites

- VMware ESXi 7.0+ or vSphere with VMs running Ubuntu/RHEL
- Kubernetes installed via kubeadm on the VMs
- `kubectl` cluster-admin access
- `cilium` CLI installed on the management machine
- `hubble` CLI installed if you want to run `hubble observe`
- VMware portgroups configured to allow node-to-node VXLAN traffic on UDP port 8472

## Step 1: Prepare VMware Network Configuration

For Cilium VXLAN mode, ensure VMware virtual switches and upstream firewalls allow node-to-node UDP traffic on port 8472. The promiscuous mode, MAC address changes, and forged transmits settings are not normally required for Cilium VXLAN, but they may be needed for configurations that emit traffic with MAC addresses different from the VM's vNIC, such as nested virtualization or some L2 announcement setups:

```bash
# On ESXi host: only apply these security settings if your Cilium mode needs
# the guest VM to send or receive traffic for non-vNIC MAC addresses.

# This is typically done via vSphere Web Client or esxcli
# Optional settings on the vSwitch portgroup:
# - Allow Promiscuous Mode: Accept (for some Cilium configurations)
# - Allow MAC Address Changes: Accept
# - Allow Forged Transmits: Accept

# Via esxcli on the ESXi host:
esxcli network vswitch standard portgroup policy security set \
  --portgroup-name "VM Network" \
  --allow-promiscuous true \
  --allow-mac-change true \
  --allow-forged-transmits true
```

Configure the VM network interfaces for Cilium:

```bash
# On each Kubernetes node VM, verify the network interface
# Cilium uses the default interface for VXLAN traffic
ip link show
# Identify the primary interface (typically eth0 or ens192 on VMware)

# If this node previously had another CNI installed, reset that CNI cleanly
# before installing Cilium. Do not flush iptables on an active cluster.
```

## Step 2: Initialize Kubernetes Cluster

```bash
# Initialize with a pod CIDR that doesn't overlap with VM network
sudo kubeadm init \
  --pod-network-cidr=10.244.0.0/16 \
  --apiserver-advertise-address=<VM_IP>

# Set up kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# Untaint control plane for single-node setups
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
```

## Step 3: Install Cilium on VMware Kubernetes

```bash
# Add Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update
```

Create Cilium values for VMware:

```yaml
# cilium-vmware-values.yaml - Cilium configuration for VMware ESXi environments
# Detect the node's primary interface automatically
autoDirectNodeRoutes: false

# Use VXLAN tunneling for cross-node pod networking on VMware
routingMode: tunnel
tunnelProtocol: vxlan

# Keep kube-proxy enabled for a standard kubeadm installation
kubeProxyReplacement: false

# Standard IPAM (not ENI or Azure)
ipam:
  mode: cluster-pool
  operator:
    clusterPoolIPv4PodCIDRList:
      - 10.244.0.0/16

# Enable Hubble for observability
hubble:
  relay:
    enabled: true
  ui:
    enabled: true

# eBPF masquerading for IPv4 SNAT
bpf:
  masquerade: true

# Account for VXLAN overhead when the underlay MTU is 1500
MTU: 1450
```

Install Cilium:

```bash
# Install Cilium with VMware-specific configuration
helm install cilium cilium/cilium \
  --version 1.15.0 \
  --namespace kube-system \
  -f cilium-vmware-values.yaml

# Wait for Cilium to be fully ready
cilium status --wait

# Run connectivity tests
cilium connectivity test
```

## Step 4: Apply Network Policies

```yaml
# cilium-vmware-policy.yaml - Network policy for VMware-hosted workloads
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: secure-production
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      tier: backend
  ingress:
    - fromEndpoints:
        - matchLabels:
            tier: frontend
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
    # Allow health checks from monitoring namespace
    - fromEndpoints:
        - matchLabels:
            app: prometheus
            k8s:io.kubernetes.pod.namespace: monitoring
      toPorts:
        - ports:
            - port: "9090"
              protocol: TCP
```

## Step 5: Verify and Monitor

```bash
# Check Cilium agent status on all nodes
kubectl exec -n kube-system ds/cilium -- cilium status

# View endpoint policy enforcement
kubectl exec -n kube-system ds/cilium -- cilium endpoint list

# Observe traffic with Hubble
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &
hubble observe --namespace production
```

## Best Practices

- Allow UDP port 8472 between Kubernetes nodes for Cilium VXLAN traffic
- Use VMware NSX-T networking features alongside Cilium when your platform design requires NSX-managed overlays or firewalling
- Test MTU settings carefully - VMware VMXNET3 adapters default to 1500, set Cilium MTU to 1450 for VXLAN
- Enable promiscuous mode only on portgroups used by Kubernetes nodes, not broadly across the ESXi environment
- Use vSphere resource pools to ensure Kubernetes nodes have dedicated CPU/memory resources

## Conclusion

Cilium works reliably on VMware ESXi-hosted Kubernetes clusters with VXLAN encapsulation. The main considerations are allowing node-to-node VXLAN traffic and configuring MTU for VXLAN overhead. Once configured correctly, Cilium provides the same eBPF-based network policies and Hubble observability on VMware as on cloud environments, bringing enterprise-grade network security to on-premises Kubernetes deployments.
