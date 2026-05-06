# How to Install Calico CNI with a Custom IPv4 Pod CIDR

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Calico, Kubernetes, IPv4, CNI, Pod CIDR, Networking

Description: Install Calico CNI on a Kubernetes cluster and configure it to use a custom IPv4 CIDR pool for pod address allocation.

Calico is a popular CNI plugin that provides networking and network policy for Kubernetes. The manifest-based install defaults the IPv4 pool to `192.168.0.0/16` - here's how to customize it to match your cluster's Pod CIDR.

## Prerequisites

```bash
# Verify kubeadm was initialized with a matching Pod CIDR

kubectl cluster-info dump | grep cluster-cidr
# or check controller-manager flags
kubectl get pod -n kube-system kube-controller-manager-<node> -o yaml | grep cidr
```

## Method 1: Install Calico with a Custom CIDR via Operator

```bash
# Install the Calico operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Create custom installation config with your CIDR
cat > calico-installation.yaml << 'EOF'
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - name: default-ipv4-ippool
      # Set to match your kubeadm --pod-network-cidr
      cidr: 10.244.0.0/16
      encapsulation: VXLANCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
      blockSize: 26
EOF

kubectl create -f calico-installation.yaml
```

## Method 2: Install Calico with Manifests and Edit Directly

```bash
# Download the Calico manifest
wget https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml

# Edit the CALICO_IPV4POOL_CIDR environment variable
# Find and change: "192.168.0.0/16" to your custom CIDR
sed -i 's|# - name: CALICO_IPV4POOL_CIDR|- name: CALICO_IPV4POOL_CIDR|' calico.yaml
sed -i 's|#   value: "192.168.0.0/16"|  value: "10.244.0.0/16"|' calico.yaml

# Apply the modified manifest
kubectl apply -f calico.yaml
```

## Verifying the IP Pool Configuration

```bash
# Install calicoctl
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o calicoctl
chmod +x calicoctl && sudo mv calicoctl /usr/local/bin/

# View IP pools
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get ippool -o yaml

# Expected output includes:
# spec:
#   cidr: 10.244.0.0/16
#   natOutgoing: true
#   # encapsulation depends on install method:
#   # operator example: ipipMode: Never, vxlanMode: CrossSubnet
#   # calico.yaml default: ipipMode: Always, vxlanMode: Never
```

## Modifying an Existing IP Pool

```bash
# Existing pool CIDRs should be migrated to a new pool, not edited in place.
# Operator installs: add a new pool with the new CIDR, then set the old pool's nodeSelector to "!all()"
kubectl edit installation default

# Manifest installs: add a new pool and disable the old one
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl get ippool -o yaml > pools.yaml

# Edit pools.yaml:
# - add a new IPPool with the new cidr
# - set disabled: true on the old pool
# Then apply the updated pools
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl apply -f pools.yaml
```

## Verifying Pod IP Assignment

```bash
# Check that pods receive IPs from the custom CIDR
kubectl get pods --all-namespaces -o wide | awk '{print $7}' | sort | head -20

# All IPs should be in the 10.244.0.0/16 range
kubectl run test-calico --image=alpine --restart=Never --command -- sleep 3600
kubectl get pod test-calico -o wide
# Expected IP: 10.244.x.x

# View Calico node IP block assignments
DATASTORE_TYPE=kubernetes KUBECONFIG=~/.kube/config calicoctl ipam show --show-blocks
```

## Check Calico System Status

```bash
# Verify all Calico pods are running
# Operator install
kubectl get pods -n calico-system
# Manifest install
kubectl get pods -n kube-system | grep calico

# Check calico-node DaemonSet is ready on all nodes
# Operator install
kubectl rollout status daemonset/calico-node -n calico-system
# Manifest install
kubectl rollout status daemonset/calico-node -n kube-system
```

The Calico `blockSize` (default `/26`) controls how the pool CIDR is subdivided per node - set it when you create the pool if you need more or fewer pod addresses per node.
