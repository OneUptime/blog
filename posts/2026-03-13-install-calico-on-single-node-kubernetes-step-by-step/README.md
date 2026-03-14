# How to Install Calico on Single-Node Kubernetes Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, Single-Node

Description: A step-by-step guide to installing Calico on a single-node bare-metal or VM Kubernetes cluster bootstrapped with kubeadm.

---

## Introduction

Single-node Kubernetes clusters are ideal for learning network policies, developing Calico configurations, and running CI/CD pipeline tests. While single-node setups are not for production, having Calico installed gives developers a realistic environment to develop and test network policies before deploying to multi-node clusters.

This guide covers installing Calico on a single-node kubeadm cluster, including the necessary configuration adjustments for single-node operation.

## Prerequisites

- A Linux machine or VM (Ubuntu 20.04+ or similar)
- At least 2 CPU cores and 4GB RAM
- `kubectl` installed
- `calicoctl` installed
- Root or sudo access

## Step 1: Install Kubernetes with kubeadm on a Single Node

```bash
# Install container runtime (containerd)
sudo apt-get update
sudo apt-get install -y containerd
sudo mkdir -p /etc/containerd
containerd config default | sudo tee /etc/containerd/config.toml
sudo systemctl restart containerd

# Install kubeadm, kubelet, kubectl
curl -fsSL https://pkgs.k8s.io/core:/stable:/v1.29/deb/Release.key | \
  sudo gpg --dearmor -o /etc/apt/keyrings/kubernetes-apt-keyring.gpg
echo 'deb [signed-by=/etc/apt/keyrings/kubernetes-apt-keyring.gpg] https://pkgs.k8s.io/core:/stable:/v1.29/deb/ /' | \
  sudo tee /etc/apt/sources.list.d/kubernetes.list
sudo apt-get update
sudo apt-get install -y kubeadm kubelet kubectl
sudo apt-mark hold kubeadm kubelet kubectl

# Disable swap (required for Kubernetes)
sudo swapoff -a
sudo sed -i '/ swap / s/^\(.*\)$/#\1/g' /etc/fstab

# Load required kernel modules
sudo modprobe overlay
sudo modprobe br_netfilter
```

Initialize the single-node cluster:

```bash
# Initialize with pod CIDR for Calico (no control plane taints)
sudo kubeadm init \
  --pod-network-cidr=192.168.0.0/16 \
  --ignore-preflight-errors=NumCPU

# Set up kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# IMPORTANT: Untaint the control plane so pods can schedule on it
kubectl taint nodes --all node-role.kubernetes.io/control-plane-
kubectl taint nodes --all node-role.kubernetes.io/master-
```

## Step 2: Install Calico

```bash
# Install the Tigera Operator
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml

# Wait for operator
kubectl wait --for=condition=Available deployment/tigera-operator \
  -n tigera-operator --timeout=120s
```

Create Calico installation for single-node:

```yaml
# calico-installation-single-node.yaml - Calico for single-node cluster
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
        cidr: 192.168.0.0/16
        # VXLAN works for single-node (no actual cross-node traffic needed)
        encapsulation: VXLAN
        natOutgoing: Enabled
        nodeSelector: all()
```

Apply and verify:

```bash
# Install Calico
kubectl apply -f calico-installation-single-node.yaml

# Wait for Calico to be ready
kubectl wait --for=condition=Ready tigerastatus/calico --timeout=300s

# Node should now be Ready
kubectl get nodes
```

## Step 3: Install calicoctl

```bash
# Install calicoctl
curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl

# Configure for Kubernetes datastore
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/config

# Verify
calicoctl get nodes
```

## Step 4: Test Network Policies

Deploy test applications to verify policies work:

```bash
# Deploy two test pods
kubectl run nginx --image=nginx --port=80 --expose
kubectl run curl-test --image=curlimages/curl:latest -- sleep 3600

# Test connectivity (should work before any policies)
kubectl exec curl-test -- curl http://nginx

# Apply a deny-all policy
cat <<EOF | kubectl apply -f -
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  selector: all()
  types:
    - Ingress
EOF

# Test that traffic is now blocked
kubectl exec curl-test -- curl --max-time 5 http://nginx
# Should timeout

# Allow specific traffic
cat <<EOF | kubectl apply -f -
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-curl-to-nginx
  namespace: default
spec:
  selector: run == 'nginx'
  ingress:
    - action: Allow
      source:
        selector: run == 'curl-test'
  types:
    - Ingress
EOF

# Traffic should now work again
kubectl exec curl-test -- curl http://nginx
```

## Best Practices

- Use single-node clusters in CI/CD pipelines for automated Calico policy testing
- Keep single-node Calico configuration in sync with your production cluster's Calico version
- Use namespaces to simulate multi-tenant environments even in single-node setups
- Test both `calicoctl` and `kubectl` commands for policy management to understand the differences
- Clean up test policies with `calicoctl delete networkpolicies --all -n default` before starting new tests

## Conclusion

A single-node Calico cluster is an excellent development environment for learning and testing network policies before deploying to production. The installation with the Tigera Operator is identical to multi-node clusters, ensuring your policies and calicoctl commands are transferable. Use this setup to build confidence with Calico's policy API before applying changes to production clusters.
