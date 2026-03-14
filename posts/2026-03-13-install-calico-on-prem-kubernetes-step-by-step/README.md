# How to Install Calico on On-Prem Kubernetes Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, On-Premises, Installation

Description: A complete step-by-step guide to installing Calico as the CNI plugin on a self-hosted, on-premises Kubernetes cluster.

---

## Introduction

Installing Calico on an on-premises Kubernetes cluster gives you full control over pod networking, network policy enforcement, and BGP routing. Unlike managed cloud Kubernetes offerings, on-prem clusters require you to handle every layer of the network stack yourself — from the physical switch configuration to the CNI plugin.

Calico is a natural fit for on-prem deployments because it supports BGP peering with physical routers, eliminating the need for overlay networks and reducing latency. It also supports pure iptables and eBPF dataplanes, giving you flexibility based on your kernel version and performance requirements.

This guide covers the full installation process using the Tigera Operator on a kubeadm-provisioned on-premises cluster.

## Prerequisites

- A kubeadm-bootstrapped Kubernetes cluster with no CNI installed
- All nodes running Linux with kernel 4.19 or later
- Pod CIDR configured (e.g., `192.168.0.0/16`) during `kubeadm init`
- `kubectl` with cluster admin access
- Internet access or a local mirror for pulling Calico images

## Step 1: Initialize the Cluster Without a CNI

If bootstrapping fresh, initialize kubeadm with the pod CIDR that Calico will manage.

```bash
kubeadm init --pod-network-cidr=192.168.0.0/16
```

Export kubeconfig:

```bash
mkdir -p $HOME/.kube
sudo cp /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config
```

## Step 2: Install the Tigera Operator

```bash
kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
```

Wait for the operator to become ready:

```bash
kubectl wait --for=condition=Available deployment/tigera-operator -n tigera-operator --timeout=120s
```

## Step 3: Create the Installation Custom Resource

```yaml
# calico-installation.yaml
apiVersion: operator.tigera.io/v1
kind: Installation
metadata:
  name: default
spec:
  calicoNetwork:
    ipPools:
    - blockSize: 26
      cidr: 192.168.0.0/16
      encapsulation: IPIPCrossSubnet
      natOutgoing: Enabled
      nodeSelector: all()
```

```bash
kubectl apply -f calico-installation.yaml
```

## Step 4: Wait for Calico to Become Ready

```bash
kubectl wait --for=condition=Ready tigerastatus/calico --timeout=300s
kubectl get pods -n calico-system
```

All pods should reach `Running` status within a few minutes.

## Step 5: Verify Node Readiness

```bash
kubectl get nodes
```

All nodes should transition from `NotReady` to `Ready` once the `calico-node` DaemonSet pod is running on each.

## Step 6: Install calicoctl

```bash
curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
chmod +x calicoctl && sudo mv calicoctl /usr/local/bin/
calicoctl version
```

## Conclusion

Installing Calico on an on-premises Kubernetes cluster involves initializing kubeadm with the correct pod CIDR, deploying the Tigera Operator, and applying an Installation CR. The operator handles the rest automatically. Once nodes are Ready and all Calico pods are running, your cluster is ready to enforce network policies and route pod traffic.
