# How to Set Up Rancher High Availability with Three Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, High Availability, Installation

Description: Deploy a production-grade Rancher installation with three-node high availability using K3s and embedded etcd.

Running Rancher in a single-node configuration works for testing and development, but production environments require high availability to prevent downtime. A three-node HA setup ensures that if one node fails, the remaining nodes continue to serve the Rancher dashboard and API. This guide covers setting up a three-node Rancher HA cluster using K3s with embedded etcd.

## Prerequisites

- Three Linux servers (Ubuntu 22.04 recommended) with at least 4 GB RAM and 2 CPU cores each
- Network connectivity between all three nodes
- SSH access to all nodes
- A load balancer in front of all three nodes, plus a domain name pointing to the load balancer
- A fixed IP address for each node

## Architecture Overview

In this setup, all three nodes run K3s as server (control plane) nodes with embedded etcd for distributed data storage. Rancher runs on top of this cluster with three replicas spread across the cluster. If any single node goes down, the remaining two maintain quorum and continue operating.

Node layout:

- Node 1: 192.168.1.101 (initial server)
- Node 2: 192.168.1.102 (joining server)
- Node 3: 192.168.1.103 (joining server)

## Step 1: Initialize the First K3s Node

SSH into the first node and install K3s with the cluster-init flag to enable embedded etcd:

```bash
ssh ubuntu@192.168.1.101

curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com \
  --tls-san 192.168.1.101 \
  --tls-san 192.168.1.102 \
  --tls-san 192.168.1.103
```

The `--tls-san` flags add Subject Alternative Names to the K3s API server certificate, allowing connections through the domain name and all node IPs.

Retrieve the node token for joining additional nodes:

```bash
sudo cat /var/lib/rancher/k3s/server/node-token
```

Save this token. You will need it for the next steps.

## Step 2: Join the Second Node

SSH into the second node and join it to the cluster:

```bash
ssh ubuntu@192.168.1.102

curl -sfL https://get.k3s.io | sh -s - server \
  --server https://192.168.1.101:6443 \
  --token <node-token> \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com \
  --tls-san 192.168.1.101 \
  --tls-san 192.168.1.102 \
  --tls-san 192.168.1.103
```

Replace `<node-token>` with the token from Step 1.

## Step 3: Join the Third Node

SSH into the third node:

```bash
ssh ubuntu@192.168.1.103

curl -sfL https://get.k3s.io | sh -s - server \
  --server https://192.168.1.101:6443 \
  --token <node-token> \
  --write-kubeconfig-mode 644 \
  --tls-san rancher.example.com \
  --tls-san 192.168.1.101 \
  --tls-san 192.168.1.102 \
  --tls-san 192.168.1.103
```

## Step 4: Verify the Cluster

On any of the nodes, verify that all three nodes are ready:

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
kubectl get nodes
```

You should see all three nodes in `Ready` status with the `control-plane` and `etcd` roles.

## Step 5: Install Helm

On the first node:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

## Step 6: Install cert-manager

```bash
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true
```

Wait for cert-manager pods:

```bash
kubectl get pods -n cert-manager
```

## Step 7: Install Rancher with Three Replicas

```bash
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

kubectl create namespace cattle-system

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set bootstrapPassword=admin \
  --set replicas=3
```

The `replicas=3` setting deploys three Rancher server replicas for high availability. Rancher uses pod anti-affinity to spread replicas across nodes when possible.

## Step 8: Verify Rancher HA

Wait for the deployment:

```bash
kubectl -n cattle-system rollout status deploy/rancher
```

Verify that pods are distributed across nodes:

```bash
kubectl -n cattle-system get pods -o wide
```

You should see three Rancher pods. In a healthy three-node cluster, they should normally be scheduled across the three nodes.

## Step 9: Configure DNS

Set up DNS so the Rancher hostname points to a load balancer in front of the three nodes. The load balancer should forward TCP/80 and TCP/443 to all three nodes.

Example:

```plaintext
rancher.example.com  A  192.168.1.200
```

## Step 10: Access Rancher

Navigate to `https://rancher.example.com` in your browser. Log in with the bootstrap password and set your admin credentials.

## Testing Failover

To verify high availability, you can simulate a node failure by shutting down one of the servers:

```bash
# On one of the nodes

sudo systemctl stop k3s
```

Access the Rancher UI through `https://rancher.example.com`. It should continue to function normally while the load balancer routes traffic to the healthy nodes. Restart the stopped node to rejoin the cluster:

```bash
sudo systemctl start k3s
```

## Backup Considerations

With embedded etcd, backups are handled through K3s snapshot functionality:

```bash
k3s etcd-snapshot save --name pre-upgrade-snapshot
```

List existing snapshots:

```bash
k3s etcd-snapshot list
```

## Summary

You have set up a production-grade Rancher installation with three-node high availability. The embedded etcd cluster provides distributed consensus, and running three Rancher replicas ensures the management UI remains accessible even if a node fails. This configuration is the recommended minimum for production Rancher deployments.
