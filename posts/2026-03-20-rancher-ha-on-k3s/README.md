# How to Set Up Rancher HA on K3s - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, k3s, High Availability, Kubernetes, Lightweight, Edge

Description: Deploy Rancher in HA mode on K3s for resource-constrained environments using embedded etcd, minimal node requirements, and a simple load balancer.

## Introduction

K3s is a lightweight Kubernetes distribution ideal for edge, IoT, and resource-constrained environments. Running Rancher on K3s can simplify HA deployments because K3s's embedded etcd mode provides HA without a separate etcd cluster.

## Prerequisites

- 3 Linux nodes with at least 4 vCPU / 16GB RAM each
- A load balancer or VIP in front of the cluster for ports 6443, 80, and 443
- DNS for `rancher.example.com` pointing to that load balancer or VIP
- A K3s version supported by your target Rancher release
- `helm` and `kubectl`

## Step 1: Install K3s on the First Server

```bash
# On server-1 - Initialize the embedded etcd cluster

curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION="<supported-k3s-version>" \
  K3S_TOKEN="mysupersecrettoken" \
  sh -s - server \
  --cluster-init \
  --tls-san rancher.example.com \
  --tls-san 10.0.0.10 \
  --write-kubeconfig-mode 644

# If you let K3s generate the token, retrieve it with:
cat /var/lib/rancher/k3s/server/token
```

## Step 2: Join Additional Server Nodes

```bash
# On server-2 and server-3
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION="<supported-k3s-version>" \
  K3S_TOKEN="mysupersecrettoken" \
  sh -s - server \
  --server https://rancher.example.com:6443 \
  --tls-san rancher.example.com \
  --tls-san 10.0.0.10 \
  --write-kubeconfig-mode 644
```

## Step 3: Verify Cluster Health

```bash
# Check all K3s nodes
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes

# Verify embedded etcd members from a server node.
# K3s does not bundle etcdctl, so install it first if needed.
sudo etcdctl member list \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/k3s/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/k3s/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/k3s/server/tls/etcd/client.key
```

## Step 4: Verify the Built-in Traefik Ingress Controller

```bash
kubectl -n kube-system get pods | grep traefik
kubectl -n kube-system get svc traefik
```

## Step 5: Install cert-manager and Rancher

```bash
# cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --set crds.enabled=true \
  --wait

# Rancher
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.example.com \
  --set replicas=3 \
  --set ingress.ingressClassName=traefik
```

## Step 6: Add Worker Nodes

```bash
# Add worker nodes to the K3s cluster
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION="<supported-k3s-version>" \
  K3S_URL="https://rancher.example.com:6443" \
  K3S_TOKEN="mysupersecrettoken" \
  sh -
```

## Conclusion

Rancher HA on K3s provides a streamlined management platform suitable for edge deployments or environments where a smaller Kubernetes distribution is preferred. K3s's embedded etcd eliminates the need for a separate etcd cluster while still providing HA with three server nodes, and the built-in Traefik ingress controller avoids deploying an extra ingress stack.
