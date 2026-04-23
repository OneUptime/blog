# How to Set Up Rancher HA on RKE2 - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, RKE2, Kubernetes

Description: Deploy Rancher in a highly available configuration on RKE2 with 3 control plane nodes, external load balancer, and proper etcd clustering for production reliability.

## Introduction

Running Rancher in High Availability (HA) mode on RKE2 ensures your management plane remains available even during node failures. This guide covers deploying a 3-node RKE2 cluster as the foundation for Rancher HA, including load balancer configuration, etcd setup, and Rancher installation.

## Prerequisites

- 3 Linux nodes (Ubuntu 22.04 or RHEL 8+) for control plane
- Load balancer (HAProxy, NGINX, or cloud LB)
- DNS record pointing to load balancer
- Optional TLS certificate if you plan to use `ingress.tls.source=secret` or terminate TLS on the load balancer
- Helm 3.x

## Step 1: Configure Load Balancer

```nginx
# nginx-lb.conf - Layer 4 load balancer for RKE2 HA and Rancher

stream {
    upstream rke2_servers_api {
        least_conn;
        server rke2-server-01:6443;
        server rke2-server-02:6443;
        server rke2-server-03:6443;
    }

    upstream rke2_servers_register {
        least_conn;
        server rke2-server-01:9345;
        server rke2-server-02:9345;
        server rke2-server-03:9345;
    }

    upstream rancher_http {
        least_conn;
        server rke2-server-01:80;
        server rke2-server-02:80;
        server rke2-server-03:80;
    }

    upstream rancher_https {
        least_conn;
        server rke2-server-01:443;
        server rke2-server-02:443;
        server rke2-server-03:443;
    }

    server {
        listen 6443;
        proxy_pass rke2_servers_api;
    }

    server {
        listen 9345;
        proxy_pass rke2_servers_register;
    }

    server {
        listen 80;
        proxy_pass rancher_http;
    }

    server {
        listen 443;
        proxy_pass rancher_https;
    }
}
```

## Step 2: Initialize First RKE2 Server Node

```bash
# On rke2-server-01

# Create RKE2 config
mkdir -p /etc/rancher/rke2
cat > /etc/rancher/rke2/config.yaml << EOF
token: "my-super-secret-token"  # Use a strong random token
tls-san:
  - rancher.example.com
  - 10.0.0.100  # Load balancer VIP

# etcd configuration
etcd-arg:
  - "quota-backend-bytes=8589934592"
  - "auto-compaction-mode=periodic"
  - "auto-compaction-retention=1h"

# Cluster setup
cluster-init: true
EOF

# Install RKE2
curl -sfL https://get.rke2.io | sh -

# Start RKE2 server
systemctl enable rke2-server
systemctl start rke2-server

# Wait for server to start
journalctl -u rke2-server -f &
sleep 60

# Get node token for additional nodes
cat /var/lib/rancher/rke2/server/node-token
```

## Step 3: Join Additional Control Plane Nodes

```bash
# On rke2-server-02 and rke2-server-03

mkdir -p /etc/rancher/rke2
cat > /etc/rancher/rke2/config.yaml << EOF
token: "my-super-secret-token"
server: https://rancher.example.com:9345  # Fixed registration address / load balancer
tls-san:
  - rancher.example.com
  - 10.0.0.100  # Load balancer VIP

etcd-arg:
  - "quota-backend-bytes=8589934592"
  - "auto-compaction-mode=periodic"
  - "auto-compaction-retention=1h"
EOF

# Install and start RKE2
curl -sfL https://get.rke2.io | sh -
systemctl enable rke2-server
systemctl start rke2-server

# Monitor join progress
journalctl -u rke2-server -f
```

## Step 4: Configure kubectl Access

```bash
# Copy kubeconfig from first server
mkdir -p ~/.kube
cp /etc/rancher/rke2/rke2.yaml ~/.kube/config
# Update server URL to use load balancer
sed -i 's/127.0.0.1/rancher.example.com/' ~/.kube/config
# RKE2 ships kubectl in /var/lib/rancher/rke2/bin
export PATH=/var/lib/rancher/rke2/bin:$PATH

# Verify cluster health
kubectl get nodes
kubectl get pods -n kube-system

# Verify etcd cluster health
kubectl exec -n kube-system \
  $(kubectl get pod -n kube-system -l component=etcd -o name | head -1) \
  -- sh -c "ETCDCTL_API=3 etcdctl endpoint health \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/rancher/rke2/server/tls/etcd/server-ca.crt \
  --cert=/var/lib/rancher/rke2/server/tls/etcd/client.crt \
  --key=/var/lib/rancher/rke2/server/tls/etcd/client.key"
```

## Step 5: Install cert-manager

```bash
# Install cert-manager for Rancher TLS
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --wait

kubectl get pods -n cert-manager
```

## Step 6: Install Rancher HA

```bash
# Add Rancher Helm repo
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

# Install Rancher HA
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.example.com \
  --set replicas=3 \
  --set bootstrapPassword='replace-with-a-strong-password' \
  --wait --timeout 10m

# Verify Rancher deployment
kubectl get pods -n cattle-system
kubectl rollout status deployment/rancher -n cattle-system
```

## Step 7: Verify HA Configuration

```bash
# Check all Rancher pods are running
kubectl get pods -n cattle-system -o wide

# Check node maintenance behavior
kubectl cordon rke2-server-01
# Verify Rancher remains accessible and new workloads avoid the cordoned node

# Test etcd resilience
# Stop one server (not the leader) and verify cluster remains functional
ssh rke2-server-02 systemctl stop rke2-server
kubectl get nodes  # Should still work
ssh rke2-server-02 systemctl start rke2-server
```

## Conclusion

Running Rancher HA on RKE2 provides a production-grade management platform with automatic failover. The 3-node RKE2 cluster provides etcd quorum, ensuring the cluster remains operational even when one node fails. The load balancer distributes traffic across healthy Rancher replicas, eliminating single points of failure in the management plane. Regularly test your HA configuration by performing planned failovers to ensure the cluster behaves as expected during unplanned outages.
