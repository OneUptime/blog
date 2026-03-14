# Install Calico on Self-Managed Azure Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Azure, Kubernetes, AKS, Networking, CNI, Self-Managed

Description: Guide to installing Calico as the CNI on self-managed Kubernetes clusters running on Azure Virtual Machines.

---

## Introduction

While AKS provides managed Kubernetes on Azure, some teams run self-managed Kubernetes on Azure VMs for greater control over the cluster configuration. On self-managed Azure Kubernetes, Calico can be installed as the full CNI, providing both pod networking via VXLAN overlay and advanced network policy enforcement.

This guide covers deploying Calico on a kubeadm-provisioned Kubernetes cluster running on Azure VMs.

## Prerequisites

- Azure VMs with Kubernetes installed via kubeadm
- `kubectl` cluster-admin access
- `calicoctl` installed on the management machine
- Azure Network Security Groups configured for cluster traffic

## Step 1: Configure Azure Network Security Groups

```bash
# Allow VXLAN traffic between Kubernetes nodes
az network nsg rule create \
  --resource-group my-k8s-rg \
  --nsg-name my-k8s-nsg \
  --name allow-vxlan \
  --protocol Udp \
  --direction Inbound \
  --priority 1000 \
  --source-address-prefix VirtualNetwork \
  --source-port-range "*" \
  --destination-address-prefix VirtualNetwork \
  --destination-port-range 4789 \
  --access Allow

# Allow Calico Typha communication
az network nsg rule create \
  --resource-group my-k8s-rg \
  --nsg-name my-k8s-nsg \
  --name allow-calico-typha \
  --protocol Tcp \
  --direction Inbound \
  --priority 1010 \
  --source-address-prefix VirtualNetwork \
  --source-port-range "*" \
  --destination-address-prefix VirtualNetwork \
  --destination-port-range 5473 \
  --access Allow
```

## Step 2: Initialize Kubernetes with a Non-Overlapping Pod CIDR

```bash
# Initialize kubeadm with a pod CIDR that doesn't overlap with Azure's 10.x.x.x/16
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --apiserver-advertise-address=<AZURE_VM_PRIVATE_IP>

# Configure kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
```

## Step 3: Install Calico with VXLAN on Azure

```bash
# Install the Tigera Operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

kubectl wait --for=condition=Available deployment/tigera-operator \
  -n tigera-operator --timeout=120s
```

```yaml
# calico-installation-azure.yaml - Calico with VXLAN on Azure VMs
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  cni:
    type: Calico
  calicoNetwork:
    ipPools:
      - name: default-ipv4-ippool
        # Match your kubeadm pod CIDR
        cidr: 192.168.0.0/16
        # VXLAN works well on Azure without needing route table changes
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
    # Configure MTU for Azure's network (Azure uses 1500 MTU)
    mtu: 1450
```

Apply the configuration:

```bash
# Apply the installation
kubectl apply -f calico-installation-azure.yaml

# Wait for Calico to be ready
kubectl wait --for=condition=Ready tigerastatus/calico --timeout=300s

# Verify nodes are ready
kubectl get nodes
kubectl get pods -n calico-system
```

## Step 4: Configure and Verify calicoctl

```bash
# Configure calicoctl for Kubernetes datastore
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify nodes and IP pools
calicoctl get nodes
calicoctl get ippools -o wide
```

## Step 5: Apply Network Policies

```yaml
# azure-k8s-policies.yaml - Network policies for self-managed Azure Kubernetes
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: deny-external-ingress-by-default
spec:
  # Apply to all non-system pods
  selector: projectcalico.org/namespace not in {'kube-system', 'calico-system', 'calico-apiserver', 'tigera-operator'}
  types:
    - Ingress
  ingress:
    # Only allow ingress from within the cluster
    - action: Allow
      source:
        nets:
          - 192.168.0.0/16    # Pod CIDR
          - 10.96.0.0/12      # Service CIDR
---
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-app-communications
  namespace: production
spec:
  selector: app in {'frontend', 'backend'}
  egress:
    - action: Allow
      destination:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
  types:
    - Egress
```

## Best Practices

- Set MTU to 1450 (50 bytes lower than Azure's 1500) for VXLAN overhead
- Disable IP forwarding restrictions on Azure VMs if pods cannot reach the internet
- Use Azure Proximity Placement Groups for control plane nodes to minimize etcd latency
- Enable Calico metrics and integrate with Azure Monitor for unified cluster observability
- Test pod-to-pod connectivity across nodes immediately after installation to confirm VXLAN is working

## Conclusion

Calico with VXLAN encapsulation is well-suited for self-managed Kubernetes on Azure VMs. The VXLAN overlay avoids the complexity of managing Azure UDR (User Defined Routes) for pod CIDR routing, making it the recommended encapsulation mode for most Azure deployments. Once running, Calico provides the same rich network policy capabilities as on any other platform.
