# How to Set Up K3s Multi-Node Cluster

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Multi-Node, Cluster Setup, High Availability

Description: Learn how to set up a K3s cluster with multiple server and agent nodes for production workloads.

## Introduction

While K3s works great on a single node, production deployments benefit from multiple nodes for high availability and workload distribution. K3s supports a simple multi-node setup where one or more server nodes manage the control plane and multiple agent nodes run workloads. This guide covers setting up both a single-server multi-agent cluster and a highly available multi-server cluster.

## Architecture Overview

**Single Server + Multiple Agents** (non-HA):
- 1 server node (control plane + embedded SQLite datastore by default)
- N agent nodes (workloads only)

**Multi-Server + Embedded HA** (HA):
- 3+ server nodes (with embedded etcd cluster)
- N agent nodes

## Prerequisites

- 2+ Linux nodes for a single-server cluster with agents, or 3+ server nodes for embedded etcd HA (Ubuntu 20.04+ recommended)
- Network connectivity between all nodes
- Open ports: 6443 (API), 8472/UDP (Flannel VXLAN), 10250 (if you use metrics-server), and 2379-2380 between server nodes for embedded etcd HA

## Single Server + Multiple Agents Setup

### Step 1: Install K3s on the Server Node

```bash
# On the server node (192.168.1.100)

# Use a custom token for security
curl -sfL https://get.k3s.io | \
    sudo K3S_TOKEN="MySecureK3sToken" \
    sh -

# Wait for the server to be ready
sudo k3s kubectl wait --for=condition=Ready node --all --timeout=120s

# Get the server token for agent registration
sudo cat /var/lib/rancher/k3s/server/node-token
```

### Step 2: Install K3s on Agent Nodes

```bash
# On each agent node (192.168.1.101, 192.168.1.102, etc.)
# Replace K3S_URL with your server's IP or hostname
curl -sfL https://get.k3s.io | \
    sudo K3S_URL="https://192.168.1.100:6443" \
    K3S_TOKEN="MySecureK3sToken" \
    sh -

# Check the agent service status
sudo systemctl status k3s-agent
```

### Step 3: Verify Nodes

```bash
# From the server node
sudo k3s kubectl get nodes -o wide

# Expected output:
# NAME         STATUS   ROLES                  AGE     VERSION
# server-01    Ready    control-plane,master   5m      vX.Y.Z+k3s1
# agent-01     Ready    <none>                 3m      vX.Y.Z+k3s1
# agent-02     Ready    <none>                 3m      vX.Y.Z+k3s1
```

## Multi-Server HA Setup (with Embedded etcd)

For production high availability, use embedded etcd with 3 server nodes:

### Step 1: Bootstrap the First Server

```bash
# On the first server (192.168.1.100)
curl -sfL https://get.k3s.io | \
    sudo K3S_TOKEN="MyHAToken" \
    sh -s - server \
    --cluster-init \
    --tls-san 192.168.1.99 \
    --tls-san k3s-cluster.example.com
```

`--cluster-init` initializes the embedded etcd cluster.

### Step 2: Join Additional Server Nodes

```bash
# On the second server (192.168.1.101)
curl -sfL https://get.k3s.io | \
    sudo K3S_TOKEN="MyHAToken" \
    sh -s - server \
    --server https://192.168.1.100:6443 \
    --tls-san 192.168.1.99 \
    --tls-san k3s-cluster.example.com

# On the third server (192.168.1.102)
curl -sfL https://get.k3s.io | \
    sudo K3S_TOKEN="MyHAToken" \
    sh -s - server \
    --server https://192.168.1.100:6443 \
    --tls-san 192.168.1.99 \
    --tls-san k3s-cluster.example.com
```

### Step 3: Add Agent Nodes

```bash
# On each agent node
# If the load balancer from Step 4 is not in place yet,
# use any existing server URL instead of the LB address.
curl -sfL https://get.k3s.io | \
    sudo K3S_URL="https://192.168.1.99:6443" \
    K3S_TOKEN="MyHAToken" \
    sh -
```

Use the load balancer IP (192.168.1.99) as a fixed registration address so new agents do not depend on a single server endpoint.

### Step 4: Set Up a Load Balancer

For HA, place a TCP load balancer in front of server nodes:

```nginx
# /etc/nginx/nginx.conf - nginx TCP load balancer for K3s API
events {}

stream {
    upstream k3s_servers {
        server 192.168.1.100:6443;
        server 192.168.1.101:6443;
        server 192.168.1.102:6443;
    }

    server {
        listen 6443;
        proxy_pass k3s_servers;
    }
}
```

A single Nginx instance still creates a single point of failure for the load balancer layer. If you need end-to-end HA, make the load balancer itself redundant as well.

## Using a Config File Instead of Environment Variables

Create config files for reproducible deployments:

### Server Config

```yaml
# /etc/rancher/k3s/config.yaml (on the first HA server)
# On additional servers, use server: "https://192.168.1.99:6443"
# instead of cluster-init: true, and keep the other critical flags the same.
token: "MyHAToken"
cluster-init: true
tls-san:
  - 192.168.1.99
  - k3s-cluster.example.com
cluster-cidr: "10.42.0.0/16"
service-cidr: "10.43.0.0/16"
disable:
  - servicelb  # Use MetalLB instead
node-label:
  - "tier=control-plane"
```

### Agent Config

```yaml
# /etc/rancher/k3s/config.yaml (on agent)
server: "https://192.168.1.99:6443"
token: "MyHAToken"
node-label:
  - "tier=worker"
  - "zone=us-east-1a"
kubelet-arg:
  - "max-pods=110"
```

## Deploying a Multi-Node Workload

```yaml
# multi-node-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      # Spread pods across nodes for resilience
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: my-app
      containers:
        - name: app
          image: nginx:alpine
          ports:
            - containerPort: 80
```

```bash
kubectl apply -f multi-node-app.yaml

# Verify pods are spread across nodes
kubectl get pods -o wide
```

## Labeling and Tainting Nodes

```bash
# Label agent nodes by purpose
kubectl label node agent-01 node-role.kubernetes.io/worker=true
kubectl label node agent-02 node-role.kubernetes.io/worker=true

# Taint a node for dedicated workloads
kubectl taint node agent-02 dedicated=gpu:NoSchedule
```

## Removing a Node from the Cluster

```bash
# Drain the node
kubectl drain agent-02 --ignore-daemonsets --delete-emptydir-data

# Delete the node
kubectl delete node agent-02

# On the agent node, uninstall K3s
sudo /usr/local/bin/k3s-agent-uninstall.sh
```

## Conclusion

Setting up a multi-node K3s cluster is straightforward with the install script and token-based node registration. For development and lightweight production workloads, a single-server multi-agent topology works well. For highly available control-plane nodes, use embedded etcd with at least 3 server nodes and a fixed registration address such as a load balancer. If you need end-to-end HA, make the load balancer itself redundant as well. K3s's minimal footprint means you get a fully functional HA Kubernetes cluster with far lower resource requirements than other distributions.
