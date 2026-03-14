# How to Install Calico on K3s Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, K3s

Description: A step-by-step guide to replacing K3s's default Flannel CNI with Calico for advanced network policy support.

---

## Introduction

K3s is a lightweight Kubernetes distribution designed for resource-constrained environments, IoT, and edge computing. By default, K3s uses Flannel as its CNI plugin, which does not support Kubernetes NetworkPolicy enforcement. Installing Calico on K3s replaces Flannel with a fully featured CNI that supports network policies, Calico GlobalNetworkPolicy, and advanced IP management.

Replacing the default CNI in K3s requires starting K3s with Flannel disabled. You cannot switch CNIs on a running K3s cluster without destroying and recreating it. The `--flannel-backend=none` flag tells K3s to skip Flannel installation, leaving CNI configuration to your chosen plugin.

This guide walks through creating a K3s cluster without Flannel and then installing Calico as the CNI. The process covers single-node and multi-node setups.

## Prerequisites

- Linux host (Ubuntu 20.04+ or equivalent)
- K3s v1.27+ installed or ready to install
- Internet access
- root or sudo access

## Step 1: Install K3s Without Flannel

```bash
curl -sfL https://get.k3s.io | sh -s - \
  --flannel-backend=none \
  --disable-network-policy \
  --cluster-cidr=192.168.0.0/16
```

Wait for K3s to start:

```bash
sudo k3s kubectl get nodes
```

The node will be `NotReady` until a CNI is installed.

## Step 2: Configure kubectl

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $USER ~/.kube/config
export KUBECONFIG=~/.kube/config
```

## Step 3: Install Calico

Apply the Calico manifest:

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico.yaml
```

## Step 4: Wait for Calico to Be Ready

```bash
kubectl wait --namespace kube-system \
  --for=condition=ready pod \
  --selector=k8s-app=calico-node \
  --timeout=120s
```

## Step 5: Verify Node Is Ready

```bash
kubectl get nodes
```

The node should transition to `Ready` once Calico is operational.

## Step 6: Verify Calico Pods

```bash
kubectl get pods -n kube-system | grep calico
```

## Step 7: Test Pod Networking

```bash
kubectl run test --image=busybox --restart=Never -- sleep 3600
kubectl get pod test -o wide
kubectl exec test -- ping -c 4 8.8.8.8
```

## Step 8: Install calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 \
  -o /usr/local/bin/calicoctl
chmod +x /usr/local/bin/calicoctl
calicoctl node status
```

## Conclusion

You have installed Calico on K3s by starting K3s without Flannel and applying the Calico manifest. Your K3s cluster now has full Kubernetes NetworkPolicy enforcement and Calico's advanced networking capabilities, making it suitable for edge deployments that require strong network security controls.
