# How to Configure K3s Server Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Configuration, Server Options

Description: A comprehensive reference for K3s server configuration options, covering network settings, component management, and security configurations.

## Introduction

K3s server nodes can be configured through command-line flags, environment variables, or a configuration file at `/etc/rancher/k3s/config.yaml`. Understanding the available server options allows you to customize your cluster's behavior for different environments, from minimal edge nodes to production HA deployments.

## Configuration File Location

The default configuration file is `/etc/rancher/k3s/config.yaml`. K3s reads this file automatically on startup.

```bash
sudo mkdir -p /etc/rancher/k3s
sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
# K3s server configuration

token: "SecureToken123"
EOF
```

## Core Server Options

### Cluster Token and Connectivity

```yaml
# /etc/rancher/k3s/config.yaml

# Authentication token for node registration
token: "SecureClusterToken"

# Path to a file containing the cluster token
# token-file: "/etc/rancher/k3s/token"

# TLS Subject Alternative Names for the API server certificate
tls-san:
  - 192.168.1.100
  - k3s-cluster.example.com
  - k3s.local

# Advertise the server's address to cluster members
# advertise-address: "192.168.1.100"

# Advertise port (defaults to the HTTPS listen port)
# advertise-port: 6443
```

### Networking Options

```yaml
# Pod CIDR range
cluster-cidr: "10.42.0.0/16"

# Service CIDR range
service-cidr: "10.43.0.0/16"

# Cluster DNS server IP (must be within service-cidr)
cluster-dns: "10.43.0.10"

# Cluster domain
cluster-domain: "cluster.local"

# Flannel backend selection
# To use a custom CNI such as Calico, Canal, or Cilium, set this to "none"
flannel-backend: "vxlan"
# Options: vxlan (default), host-gw, wireguard-native, none
```

### Data and Storage

```yaml
# K3s data directory
data-dir: "/var/lib/rancher/k3s"

# Disable the local storage provisioner
# disable: [local-storage]

# Default local storage path
default-local-storage-path: "/var/lib/rancher/k3s/storage"
```

### Write Kubeconfig Settings

```yaml
# Path to write the kubeconfig file
write-kubeconfig: "/etc/rancher/k3s/k3s.yaml"

# Permissions for the kubeconfig file
write-kubeconfig-mode: "0644"
```

## HA and Clustering Options

### Embedded etcd (HA Mode)

```yaml
# Initialize a new embedded etcd cluster (first server only)
cluster-init: true

# Join an existing cluster
# server: "https://existing-server:6443"

# Disable embedded etcd and use an external datastore
# datastore-endpoint: "mysql://user:pass@tcp(host:3306)/k3s"
# datastore-endpoint: "postgres://user:pass@host:5432/k3s"
```

### External Datastore

```yaml
# MySQL external datastore
datastore-endpoint: "mysql://k3s:k3spassword@tcp(mysql.example.com:3306)/k3s"

# PostgreSQL external datastore
# datastore-endpoint: "postgres://k3s:k3spassword@postgres.example.com:5432/k3s"

# etcd external datastore
# datastore-endpoint: "https://etcd.example.com:2379"
# datastore-cafile: "/etc/ssl/etcd/ca.crt"
# datastore-certfile: "/etc/ssl/etcd/client.crt"
# datastore-keyfile: "/etc/ssl/etcd/client.key"
```

## Component Management

### Disable Built-In Components

```yaml
disable:
  - traefik          # Traefik ingress controller
  - servicelb        # ServiceLB / Klipper
  - metrics-server   # Kubernetes metrics server
  - local-storage    # Local path provisioner
  - coredns          # CoreDNS (if using external DNS)
```

### Helm Chart Customization

```yaml
# Disable the bundled Helm controller entirely
disable-helm-controller: false  # Keep Helm controller enabled

# Image used for Helm jobs
# helm-job-image: "rancher/klipper-helm:v0.3.0"
```

## Security Options

### TLS and Certificates

```yaml
# Custom TLS SAN entries
tls-san:
  - 192.168.1.100
  - myserver.example.com

# Extra TLS settings passed to kube-apiserver
kube-apiserver-arg:
  - "tls-min-version=VersionTLS12"
  - "tls-cipher-suites=TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"
```

### Secrets Encryption

```yaml
# Enable secrets encryption at rest
secrets-encryption: true
```

### Service Account Tokens

```yaml
kube-apiserver-arg:
  - "service-account-max-token-expiration=86400s"
```

## Kubelet and System Configuration

```yaml
# Arguments passed to the embedded kubelet
kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=200m,memory=256Mi"
  - "system-reserved=cpu=200m,memory=256Mi"
  - "eviction-hard=memory.available<100Mi,nodefs.available<5%"
  - "container-log-max-size=50Mi"
  - "container-log-max-files=5"
  - "shutdown-grace-period=30s"

# Arguments passed to kube-proxy
kube-proxy-arg:
  - "proxy-mode=iptables"
```

## Node Configuration

```yaml
# Node name (defaults to hostname)
node-name: "k3s-server-01"

# IP address to advertise for the node
# node-ip: "192.168.1.100"

# External IP address to advertise for the node
# node-external-ip: "203.0.113.10"

# Labels to apply to the server node
node-label:
  - "tier=control-plane"
  - "region=us-east"

# Taints to apply when the server node first registers
node-taint:
  - "node-role.kubernetes.io/control-plane:NoSchedule"
```

## Egress Selector Mode

```yaml
# Configure how the apiserver connects to agents
egress-selector-mode: "agent"
# Options:
# - agent: tunnel kubelet connections through agents
# - cluster: tunnel kubelet and service endpoint traffic by watching Pods and Endpoints
# - pod: tunnel kubelet and service endpoint traffic by watching Nodes and Endpoints
# - disabled: no tunneling
```

## Complete Production Server Configuration

```yaml
# /etc/rancher/k3s/config.yaml - Production server

# Authentication
token: "ProductionToken"

# TLS
tls-san:
  - 192.168.1.99    # Load balancer IP
  - 192.168.1.100   # Server IP
  - k3s.example.com

# HA embedded etcd (first server only)
cluster-init: true

# Networking
cluster-cidr: "10.42.0.0/16"
service-cidr: "10.43.0.0/16"
cluster-dns: "10.43.0.10"
flannel-backend: "vxlan"

# Security
secrets-encryption: true
write-kubeconfig-mode: "0600"

# Disable unused components
disable:
  - servicelb

# kubelet tuning
kubelet-arg:
  - "max-pods=110"
  - "kube-reserved=cpu=300m,memory=512Mi"
  - "system-reserved=cpu=200m,memory=256Mi"
  - "eviction-hard=memory.available<150Mi,nodefs.available<10%"
  - "shutdown-grace-period=60s"

# Node identification
node-name: "k3s-server-01"
node-label:
  - "tier=control-plane"

# etcd snapshots
etcd-snapshot-schedule-cron: "0 */6 * * *"
etcd-snapshot-retention: 5
```

## Applying Configuration Changes

```bash
# Restart K3s to apply configuration changes
sudo systemctl restart k3s

# Verify the server started with new options
sudo journalctl -u k3s -n 50 --no-pager

# Check the cluster is healthy
kubectl --kubeconfig /etc/rancher/k3s/k3s.yaml get nodes
kubectl --kubeconfig /etc/rancher/k3s/k3s.yaml get pods --all-namespaces
```

## Conclusion

K3s server options provide comprehensive control over cluster networking, security, storage, and component selection. The `/etc/rancher/k3s/config.yaml` file is the recommended way to configure K3s, providing a persistent and version-controllable configuration. By understanding the available options, you can tailor K3s to run efficiently from minimal edge devices to full production HA deployments.
