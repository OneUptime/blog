# How to Configure RKE2 Server Nodes - Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE2, Kubernetes, Configuration, Control Plane, Rancher

Description: A comprehensive guide to configuring RKE2 server nodes with all available configuration options for production Kubernetes deployments.

RKE2 server nodes run the Kubernetes control plane components including the API server, controller manager, scheduler, and etcd. Properly configuring server nodes is critical for security, performance, and availability. This guide covers all the important configuration options for RKE2 server nodes.

## Prerequisites

- Linux nodes for the control plane (Ubuntu, CentOS, SLES, etc.)
- Minimum 4 vCPUs and 8 GB RAM for production server nodes
- RKE2 installation script available
- Understanding of Kubernetes control plane components

## The RKE2 Server Configuration File

RKE2 reads its configuration from `/etc/rancher/rke2/config.yaml`. This file supports all the settings that can also be passed as command-line arguments.

## Core Server Configuration

```yaml
# /etc/rancher/rke2/config.yaml - Comprehensive server configuration

# =====================

# CLUSTER CONFIGURATION
# =====================

# Join an existing cluster (for additional server nodes)
# server: https://existing-server:9345
# token: <cluster-token>

# TLS Subject Alternative Names for the API server certificate
tls-san:
  - "k8s.example.com"
  - "10.0.0.10"
  - "10.0.0.11"
  - "10.0.0.12"

# Cluster networking
cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
cluster-dns: 10.43.0.10
cluster-domain: cluster.local

# =====================
# NODE CONFIGURATION
# =====================

# Node IP to use for this server
node-ip: 10.0.0.10

# Additional node labels
node-label:
  - "node-role=control-plane"
  - "topology.kubernetes.io/zone=us-east-1a"

# Additional node taints (to prevent workloads on control plane)
node-taint:
  - "CriticalAddonsOnly=true:NoExecute"

# Node name (defaults to hostname)
# node-name: my-control-plane-01

# =====================
# NETWORKING
# =====================

# CNI plugin to use
# Options: canal, calico, cilium, none
cni: canal

# Disable kube-proxy (when using Cilium)
# disable-kube-proxy: true

# =====================
# CONTAINER RUNTIME
# =====================

# Container runtime endpoint
# container-runtime-endpoint: ""  # Uses embedded containerd

# Default registry for RKE2 system images
# system-default-registry: registry.example.com

# =====================
# ETCD CONFIGURATION
# =====================

# Disable embedded etcd on a dedicated control-plane server
# disable-etcd: true

# External datastore endpoint (for example, an external etcd cluster)
# datastore-endpoint: "https://etcd1:2379,https://etcd2:2379,https://etcd3:2379"

# External datastore client certificates
# datastore-cafile: /path/to/etcd-ca.crt
# datastore-certfile: /path/to/etcd-client.crt
# datastore-keyfile: /path/to/etcd-client.key

# Embedded etcd snapshot configuration
etcd-snapshot-schedule-cron: "0 */6 * * *"   # Every 6 hours
etcd-snapshot-retention: 10                    # Keep last 10 snapshots
etcd-snapshot-dir: /var/lib/rancher/rke2/server/db/snapshots

# =====================
# SECURITY CONFIGURATION
# =====================

# Use CIS hardened profile
profile: cis

# Disable services you don't need
disable:
  - rke2-ingress-nginx   # Disable Nginx ingress controller

# =====================
# KUBECONFIG
# =====================

# Write kubeconfig with specific permissions
write-kubeconfig-mode: "0644"

# Write kubeconfig to specific path
# write-kubeconfig: /etc/rancher/rke2/rke2.yaml
```

## Kubernetes Component Arguments

```yaml
# /etc/rancher/rke2/config.yaml - Component-specific arguments

# API Server arguments
kube-apiserver-arg:
  # Disable anonymous authentication
  - "anonymous-auth=false"
  # Enable audit logging
  - "audit-log-path=/var/log/kubernetes/audit.log"
  - "audit-log-maxage=30"
  - "audit-log-maxbackup=5"
  - "audit-log-maxsize=100"
  # Set authorization mode
  - "authorization-mode=Node,RBAC"
  # Enable admission plugins
  - "enable-admission-plugins=NodeRestriction"
  # Bind to specific address
  - "bind-address=0.0.0.0"

# Controller Manager arguments
kube-controller-manager-arg:
  # Set the node monitor grace period
  - "node-monitor-grace-period=40s"
  # Configure node eviction rate
  - "node-eviction-rate=0.1"
  # Bind to specific address
  - "bind-address=127.0.0.1"

# Scheduler arguments
kube-scheduler-arg:
  # Bind to specific address
  - "bind-address=127.0.0.1"

# etcd arguments
etcd-arg:
  # etcd heartbeat interval
  - "heartbeat-interval=500"
  # Election timeout
  - "election-timeout=5000"

# Kubelet arguments (applies to nodes running on this server)
kubelet-arg:
  # Disable anonymous authentication to kubelet
  - "anonymous-auth=false"
  # Set eviction thresholds
  - "eviction-hard=memory.available<200Mi,nodefs.available<10%,imagefs.available<15%"
  # Enable certificate rotation
  - "rotate-certificates=true"
  # Set max pods per node
  - "max-pods=250"
  # Protect kernel defaults
  - "protect-kernel-defaults=true"
```

## Multi-Server HA Configuration

```bash
# First server node initialization
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# First server node - cluster initialization
tls-san:
  - "k8s.example.com"
  - "10.0.0.10"
  - "10.0.0.11"
  - "10.0.0.12"

cluster-cidr: 10.42.0.0/16
service-cidr: 10.43.0.0/16
write-kubeconfig-mode: "0644"
EOF

sudo systemctl enable rke2-server
sudo systemctl start rke2-server

# Get the cluster token
sudo cat /var/lib/rancher/rke2/server/token
```

```bash
# Second and third server nodes
cat <<EOF | sudo tee /etc/rancher/rke2/config.yaml
# Join existing cluster as additional server
server: https://k8s.example.com:9345
token: <TOKEN_FROM_FIRST_SERVER>

tls-san:
  - "k8s.example.com"
  - "10.0.0.10"
  - "10.0.0.11"
  - "10.0.0.12"
EOF

sudo systemctl enable rke2-server
sudo systemctl start rke2-server
```

## Verify Server Configuration

```bash
# Check RKE2 server configuration
sudo rke2 server --help | grep -A2 "config"

# Verify running components
sudo /var/lib/rancher/rke2/bin/kubectl \
  --kubeconfig /etc/rancher/rke2/rke2.yaml \
  get pods -n kube-system

# Check API server arguments
sudo ps aux | grep '[k]ube-apiserver' | tr ' ' '\n' | grep -v "^$"

# Verify API server readiness, including etcd
sudo /var/lib/rancher/rke2/bin/kubectl \
  --kubeconfig /etc/rancher/rke2/rke2.yaml \
  get --raw='/readyz?verbose'
```

## Conclusion

RKE2 server configuration is highly flexible, allowing you to tune every aspect of the Kubernetes control plane to meet your requirements. The configuration file approach makes it easy to version-control your cluster configuration and apply it consistently across all server nodes. For production deployments, always run at least 3 server nodes for etcd quorum and high availability, and consider applying the CIS hardened profile to meet security requirements from day one.
