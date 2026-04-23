# How to Create an RKE Cluster Configuration File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RKE, Kubernetes, Rancher, Configuration, Cluster.yml

Description: Learn how to write and customize the RKE cluster.yml configuration file to define your cluster topology, networking, and component settings.

## Introduction

The `cluster.yml` file is the heart of every RKE cluster. It defines which nodes participate in the cluster, what roles they play, which CNI plugin to use, and how Kubernetes components are configured. Understanding how to write and tune this file is essential for RKE cluster management.

RKE1 reached end of life on July 31, 2025. Use this guidance for maintaining existing RKE1 clusters; for new clusters, use RKE2 or another supported Kubernetes distribution.

## Generating a Starter Configuration

```bash
# Generate an interactive configuration wizard

rke config --name cluster.yml

# Or generate a non-interactive skeleton
rke config --name cluster.yml --empty
```

## Full Annotated cluster.yml

```yaml
# cluster.yml - RKE cluster configuration

# Kubernetes version to deploy
kubernetes_version: "v1.28.8-rancher1-1"

# Cluster name
cluster_name: "production-cluster"

# SSH configuration
ssh_key_path: ~/.ssh/id_ed25519
ssh_agent_auth: false

# Node definitions
nodes:
  # Control plane + etcd node 1
  - address: 192.168.1.101
    hostname_override: master-01
    user: ubuntu
    port: 22
    ssh_key_path: ~/.ssh/id_ed25519
    role:
      - controlplane
      - etcd
    labels:
      environment: production
      tier: control-plane

  # Control plane + etcd node 2 (HA)
  - address: 192.168.1.102
    hostname_override: master-02
    user: ubuntu
    role:
      - controlplane
      - etcd
    labels:
      environment: production
      tier: control-plane

  # Control plane + etcd node 3 (HA)
  - address: 192.168.1.103
    hostname_override: master-03
    user: ubuntu
    role:
      - controlplane
      - etcd
    labels:
      environment: production
      tier: control-plane

  # Worker node 1
  - address: 192.168.1.104
    hostname_override: worker-01
    user: ubuntu
    role:
      - worker
    labels:
      environment: production
      tier: worker

  # Worker node 2
  - address: 192.168.1.105
    hostname_override: worker-02
    user: ubuntu
    role:
      - worker

# Network configuration
network:
  plugin: canal      # Options: canal, flannel, calico, weave, none
  options:
    canal_flannel_backend_type: "vxlan"

# Authentication configuration
authentication:
  strategy: x509
  sans:
    - 192.168.1.100     # VIP or load balancer IP
    - my-cluster.example.com

# Authorization configuration
authorization:
  mode: rbac           # Options: rbac, none

# Services configuration
services:
  # etcd configuration
  etcd:
    image: rancher/mirrored-coreos-etcd:v3.5.10
    extra_args:
      # Tune heartbeat and election timeout for stability
      heartbeat-interval: 500
      election-timeout: 5000
    # Backup configuration
    backup_config:
      enabled: true
      interval_hours: 12
      retention: 6
      safe_timestamp: false

  # kube-apiserver configuration
  kube-api:
    image: ""
    # Enable audit logging with RKE's default policy and rotation settings
    audit_log:
      enabled: true
    extra_args:
      # Security settings
      anonymous-auth: "false"
      enable-admission-plugins: "NodeRestriction,PodSecurity"
    # Service NodePort range
    service_node_port_range: 30000-32767

  # kube-controller-manager configuration
  kube-controller:
    extra_args:
      # Node monitoring settings
      node-monitor-grace-period: 40s
      node-monitor-period: 5s

  # kubelet configuration
  kubelet:
    extra_args:
      max-pods: "250"
      # Resource reservations
      kube-reserved: "cpu=300m,memory=512Mi"
      system-reserved: "cpu=300m,memory=512Mi"
      eviction-hard: "memory.available<200Mi,nodefs.available<10%"
      # Log rotation
      container-log-max-size: "50Mi"
      container-log-max-files: "5"
    # Cluster DNS domain
    cluster_domain: cluster.local
    # Cluster DNS server IP
    cluster_dns_server: 10.43.0.10
    fail_swap_on: false

  # kube-proxy configuration
  kubeproxy:
    extra_args:
      proxy-mode: ipvs    # ipvs or iptables

# Ingress configuration
ingress:
  provider: nginx
  options:
    use-forwarded-headers: "true"

# DNS configuration
dns:
  provider: coredns
  upstreamnameservers:
    - 8.8.8.8
    - 8.8.4.4
  reversecidrs:
    - 1.0.0.10.in-addr.arpa

# Monitoring configuration
monitoring:
  provider: metrics-server

# Add-on configuration
addons: |
  ---
  # Add any extra manifests here

# Private registry configuration
private_registries:
  - url: registry.example.com
    user: admin
    password: password
    is_default: false

# System images (optional - use defaults unless air-gapped)
# system_images:
#   kubernetes: rancher/hyperkube:v1.28.8-rancher1
```

## Node Role Combinations

| Roles | Description | Minimum Nodes |
|-------|-------------|---------------|
| controlplane, etcd | Combined control plane | 1 (dev) or 3 (HA) |
| worker | Compute workloads | 1+ |
| controlplane, etcd, worker | All-in-one | 1 (dev only) |

## Validating the Configuration

```bash
# Print a skeleton config to compare supported field names
rke config --print --empty

# Deploy with the config; RKE validates configuration and node access during the run
rke up --config cluster.yml
```

## Common Configuration Patterns

### Development (Single Node)

```yaml
nodes:
  - address: 192.168.1.100
    user: ubuntu
    role: [controlplane, etcd, worker]
```

### Production HA

```yaml
nodes:
  - { address: 192.168.1.101, user: ubuntu, role: [controlplane, etcd] }
  - { address: 192.168.1.102, user: ubuntu, role: [controlplane, etcd] }
  - { address: 192.168.1.103, user: ubuntu, role: [controlplane, etcd] }
  - { address: 192.168.1.104, user: ubuntu, role: [worker] }
  - { address: 192.168.1.105, user: ubuntu, role: [worker] }
  - { address: 192.168.1.106, user: ubuntu, role: [worker] }
```

## Conclusion

The RKE `cluster.yml` file provides granular control over every aspect of your Kubernetes cluster. By understanding the key sections - nodes, services, network, and authentication - you can create configurations tailored to your environment, from minimal single-node dev clusters to production HA deployments with custom admission policies, etcd backups, and performance tuning. Always validate your configuration before deployment and store `cluster.yml` in version control (excluding secrets).
