# How to Set Up Rancher HA on K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, High Availability, k3s, Lightweight Kubernetes

Description: Deploy Rancher in a highly available configuration on K3s for resource-constrained environments, using embedded or external etcd for cluster state management.

## Introduction

K3s is a lightweight Kubernetes distribution that works well for Rancher's local management cluster in resource-constrained environments. This guide covers deploying a K3s HA cluster with either embedded etcd or an external MySQL/PostgreSQL datastore, then installing Rancher on top.

## Prerequisites

- 3 Linux nodes with minimum 2 vCPU, 4GB RAM each
- Load balancer or keepalived VIP
- DNS record for Rancher hostname
- Helm 3.x

## Step 1: Configure Load Balancer

```bash
# Using keepalived for a VIP (Virtual IP) approach

# Install keepalived on all server nodes
apt install keepalived -y

# Configure on master node (highest priority)
cat > /etc/keepalived/keepalived.conf << 'EOF'
vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 101

    authentication {
        auth_type PASS
        auth_pass strong-password
    }

    virtual_ipaddress {
        10.0.0.100/24
    }
}
EOF

# Configure on backup nodes (lower priority)
# Change state to BACKUP, priority to 100

systemctl enable keepalived
systemctl start keepalived
```

## Step 2: Initialize First K3s Server

```bash
# On k3s-server-01 (the first node)
# Using embedded etcd (K3s v1.19.5+ required)

# Install K3s with embedded etcd
curl -sfL https://get.k3s.io | sh -s - server \
  --cluster-init \
  --token="my-cluster-token" \
  --tls-san=rancher.example.com \
  --tls-san=10.0.0.100 \
  --node-name=k3s-server-01

# Wait for K3s to start
systemctl status k3s

# Get the server token
cat /var/lib/rancher/k3s/server/token
```

## Step 3: Join Additional K3s Servers

```bash
# On k3s-server-02 and k3s-server-03
K3S_TOKEN="my-cluster-token"
K3S_URL="https://10.0.0.100:6443"

curl -sfL https://get.k3s.io | sh -s - server \
  --server="${K3S_URL}" \
  --token="${K3S_TOKEN}" \
  --tls-san=rancher.example.com \
  --tls-san=10.0.0.100 \
  --node-name=k3s-server-02
# Change --node-name for each node

# Verify cluster state
kubectl get nodes
```

## Step 4: Use External Datastore (Alternative)

```bash
# Alternative: use MySQL as the datastore instead of embedded etcd
# Better for environments with existing database infrastructure

# On all K3s server nodes
K3S_DATASTORE_ENDPOINT="mysql://k3s:password@tcp(mysql.example.com:3306)/k3s"

# Server 1
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="${K3S_DATASTORE_ENDPOINT}" \
  --token="my-cluster-token" \
  --tls-san=rancher.example.com \
  --tls-san=10.0.0.100

# Server 2 and 3 (same command, just joins the cluster)
curl -sfL https://get.k3s.io | sh -s - server \
  --datastore-endpoint="${K3S_DATASTORE_ENDPOINT}" \
  --token="my-cluster-token" \
  --tls-san=rancher.example.com \
  --tls-san=10.0.0.100
```

## Step 5: Configure kubectl

```bash
# Copy kubeconfig from K3s
mkdir -p ~/.kube
cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sed -i 's/127.0.0.1/10.0.0.100/' ~/.kube/config  # Use VIP

# Verify cluster
kubectl get nodes
kubectl get pods -A | head -20
```

## Step 6: Install Rancher on K3s

```bash
# Install cert-manager
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

# Install Rancher
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.example.com \
  --set replicas=3 \
  --set bootstrapPassword=admin \
  --set global.cattle.psp.enabled=false \
  --wait --timeout 10m

# Verify
kubectl rollout status deployment/rancher -n cattle-system
kubectl get pods -n cattle-system
```

## Step 7: Configure K3s for Rancher Stability

```yaml
# /etc/rancher/k3s/config.yaml - optional K3s tuning examples
# Set these before first start, and validate them against your workload

# Example embedded etcd tuning
etcd-arg:
  - "quota-backend-bytes=4294967296"  # 4GB
  - "auto-compaction-mode=periodic"
  - "auto-compaction-retention=1h"

# Optional: expose kube-proxy metrics for cluster monitoring
kube-proxy-arg:
  - "metrics-bind-address=0.0.0.0:10249"

# Example API server tuning
kube-apiserver-arg:
  - "default-watch-cache-size=500"
  - "request-timeout=600s"
```

## Step 8: Verify HA and Failover

```bash
# Test HA by stopping one server
ssh k3s-server-02 systemctl stop k3s

# Verify cluster is still accessible
kubectl get nodes
kubectl get pods -n cattle-system

# Rancher UI should remain accessible via load balancer
curl -sk https://rancher.example.com/ping

# Restart stopped node
ssh k3s-server-02 systemctl start k3s

# Verify node rejoined
kubectl get nodes -w
```

## Conclusion

K3s provides an excellent foundation for Rancher HA in resource-constrained environments. Its embedded etcd eliminates the need for external database dependencies, while the clustered setup provides the quorum needed for high availability. For larger production environments, consider RKE2, which Rancher positions for datacenter and cloud installations. For smaller deployments and edge scenarios, K3s offers the right balance of simplicity and reliability.
