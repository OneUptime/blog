# How to Set Up RKE2 High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, High Availability, etcd, Load Balancer, Rancher

Description: Learn how to set up a highly available RKE2 Kubernetes cluster with multiple control plane nodes and a load balancer for production deployments.

High availability (HA) is critical for production Kubernetes clusters. An HA RKE2 cluster reduces control plane single points of failure by running multiple control plane nodes with etcd in a cluster configuration. This guide covers setting up a production-grade HA RKE2 cluster with an external load balancer.

## Architecture Overview

A typical HA RKE2 setup consists of:

- An odd number of server (control plane) nodes, with 3 recommended
- An external load balancer (HAProxy, nginx, or cloud LB) in front of the RKE2 registration and Kubernetes API endpoints
- Multiple worker (agent) nodes
- etcd running on each control plane node (embedded)

```text
                    ┌──────────────────┐
                    │   Load Balancer   │
                    │  (HAProxy/nginx)  │
                    └────────┬─────────┘
                             │ Ports 6443/9345
               ┌─────────────┼─────────────┐
               │             │             │
         ┌─────▼─────┐ ┌─────▼─────┐ ┌────▼──────┐
         │ Server 1   │ │ Server 2   │ │ Server 3   │
         │ (CP+etcd) │ │ (CP+etcd) │ │ (CP+etcd) │
         └─────┬─────┘ └─────┬─────┘ └─────┬─────┘
               │             │             │
         ┌─────▼─────────────▼─────────────▼─────┐
         │           Worker Nodes (Agents)          │
         └─────────────────────────────────────────┘
```

## Prerequisites

- 3 Linux nodes for control plane (4+ vCPUs, 8+ GB RAM each)
- 2+ Linux nodes for workers (2+ vCPUs, 4+ GB RAM each)
- RKE2 installed on all nodes, with the server service on control plane nodes and the agent service on workers
- A load balancer node or service (make the load balancer itself highly available for production)
- All nodes on the same network
- A DNS record or VIP for the cluster endpoint
- Unique hostnames or configured `node-name` values for every node

## Step 1: Set Up the Load Balancer

### Option A: HAProxy

```bash
# Install HAProxy on a dedicated node or use your existing LB

sudo apt-get install -y haproxy  # Ubuntu/Debian
# or
sudo yum install -y haproxy      # CentOS/RHEL

# Configure HAProxy
cat <<EOF | sudo tee /etc/haproxy/haproxy.cfg
global
    log /dev/log local0
    maxconn 4096
    daemon

defaults
    log     global
    mode    tcp
    option  tcplog
    option  dontlognull
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

# RKE2 API Server Load Balancing
frontend rke2-api
    bind *:6443
    default_backend rke2-api-backend

backend rke2-api-backend
    balance roundrobin
    option tcp-check
    # Add your control plane node IPs here
    server server1 10.0.0.11:6443 check
    server server2 10.0.0.12:6443 check
    server server3 10.0.0.13:6443 check

# RKE2 Registration Port (for agent nodes)
frontend rke2-registration
    bind *:9345
    default_backend rke2-registration-backend

backend rke2-registration-backend
    balance roundrobin
    option tcp-check
    server server1 10.0.0.11:9345 check
    server server2 10.0.0.12:9345 check
    server server3 10.0.0.13:9345 check
EOF

sudo systemctl enable --now haproxy
sudo systemctl status haproxy
```

### Option B: Nginx Stream Proxy

```bash
# Install nginx with stream module
sudo apt-get install -y nginx nginx-extras

# Create stream configuration
cat <<EOF | sudo tee /etc/nginx/stream.conf
upstream rke2-api {
    server 10.0.0.11:6443 max_fails=3 fail_timeout=5s;
    server 10.0.0.12:6443 max_fails=3 fail_timeout=5s;
    server 10.0.0.13:6443 max_fails=3 fail_timeout=5s;
}

upstream rke2-registration {
    server 10.0.0.11:9345 max_fails=3 fail_timeout=5s;
    server 10.0.0.12:9345 max_fails=3 fail_timeout=5s;
    server 10.0.0.13:9345 max_fails=3 fail_timeout=5s;
}

server {
    listen 6443;
    proxy_pass rke2-api;
    proxy_timeout 30s;
    proxy_connect_timeout 5s;
}

server {
    listen 9345;
    proxy_pass rke2-registration;
}
EOF

# Include stream config in nginx.conf
echo "stream { include /etc/nginx/stream.conf; }" | \
  sudo tee -a /etc/nginx/nginx.conf

sudo nginx -t
sudo systemctl restart nginx
```

## Step 2: Initialize the First Server Node

```bash
# On the FIRST control plane node
sudo mkdir -p /etc/rancher/rke2

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# Use the load balancer address as the cluster endpoint
tls-san:
  - "k8s.example.com"          # DNS name pointing to LB
  - "10.0.0.10"                # Load balancer IP
  - "10.0.0.11"                # Server 1 IP
  - "10.0.0.12"                # Server 2 IP
  - "10.0.0.13"                # Server 3 IP

# Cluster networking
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
write-kubeconfig-mode: "0644"

# etcd snapshot configuration
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 10
EOF

# Start the first server
sudo systemctl enable rke2-server
sudo systemctl start rke2-server

# Wait for it to be ready
sudo journalctl -u rke2-server -f &
sleep 60

# Get the node token for other servers and agents
sudo cat /var/lib/rancher/rke2/server/node-token
```

## Step 3: Join Additional Control Plane Nodes

```bash
# On the SECOND and THIRD control plane nodes
NODE_TOKEN="<TOKEN_FROM_FIRST_SERVER>"
LOAD_BALANCER_IP="10.0.0.10"

sudo mkdir -p /etc/rancher/rke2

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# Join the existing cluster through the load balancer
server: https://${LOAD_BALANCER_IP}:9345
token: ${NODE_TOKEN}

tls-san:
  - "k8s.example.com"
  - "${LOAD_BALANCER_IP}"
  - "10.0.0.11"
  - "10.0.0.12"
  - "10.0.0.13"

# Cluster networking must match the first server
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
write-kubeconfig-mode: "0644"
EOF

sudo systemctl enable rke2-server
sudo systemctl start rke2-server

# Monitor join process
sudo journalctl -u rke2-server -f
```

## Step 4: Join Worker Nodes

```bash
# On each worker node
NODE_TOKEN="<TOKEN_FROM_FIRST_SERVER>"
LOAD_BALANCER_IP="10.0.0.10"

sudo mkdir -p /etc/rancher/rke2

cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
server: https://${LOAD_BALANCER_IP}:9345
token: ${NODE_TOKEN}
EOF

sudo systemctl enable rke2-agent
sudo systemctl start rke2-agent
```

## Step 5: Configure kubectl with HA Endpoint

```bash
# On any server node
mkdir -p ~/.kube
sudo cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config

# Update the server address to use the load balancer
sed -i 's/127.0.0.1/10.0.0.10/' ~/.kube/config

# Or use the DNS name
# sed -i 's/127.0.0.1/k8s.example.com/' ~/.kube/config

# Verify HA cluster
/var/lib/rancher/rke2/bin/kubectl get nodes
```

## Step 6: Verify HA Setup

```bash
# Verify all control plane nodes are registered
/var/lib/rancher/rke2/bin/kubectl get nodes | grep control-plane

# List etcd members
sudo ETCDCTL_API=3 \
  ETCDCTL_ENDPOINTS=https://127.0.0.1:2379 \
  ETCDCTL_CACERT=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  ETCDCTL_CERT=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  ETCDCTL_KEY=/var/lib/rancher/rke2/server/tls/etcd/client.key \
  /var/lib/rancher/rke2/bin/etcdctl member list

# Expected output shows 3 etcd members (one per server node)
```

## Conclusion

Setting up RKE2 HA requires careful planning around load balancer configuration, node ordering, and token management. The key to a successful HA deployment is ensuring all TLS SANs are correctly configured before starting the first server, using the load balancer endpoint for agent registration, and verifying that all three server nodes are listed as etcd members. Once established, the HA cluster can survive the loss of one control plane node without losing etcd quorum or Kubernetes API availability through the load balancer.
