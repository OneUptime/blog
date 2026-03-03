# How to Design Multi-Master Architecture with Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Multi-Master, Architecture, High Availability, Kubernetes, etcd

Description: Design and implement a multi-master Kubernetes architecture on Talos Linux for maximum resilience, scalability, and fault tolerance in production.

---

Multi-master architecture is the foundation of a production-grade Kubernetes cluster. By running multiple control plane nodes, each capable of serving API requests and participating in cluster state management, you eliminate single points of failure at the most critical layer of your infrastructure. Talos Linux is particularly well-suited for multi-master deployments because its immutable, API-driven design ensures that every control plane node is configured identically, removing the configuration drift that often undermines multi-master setups in traditional distributions.

This guide covers the design principles, implementation details, and operational best practices for building a multi-master architecture with Talos Linux.

## Architecture Principles

A well-designed multi-master architecture follows these principles:

1. **Odd number of masters** - Always use 3 or 5 control plane nodes for proper etcd quorum
2. **Geographic distribution** - Spread masters across failure domains
3. **Consistent configuration** - All masters run identical software and configuration
4. **Load-balanced access** - Clients connect through a load balancer, not directly to individual masters
5. **Separate control and data planes** - Do not schedule workloads on control plane nodes in production

## Sizing Your Multi-Master Cluster

The resources needed for each control plane node depend on your cluster size:

```text
Cluster Size     | CPU    | Memory | etcd Disk
(total nodes)    |        |        |
-----------------+--------+--------+-----------
Up to 10 nodes   | 2 CPU  | 4 GB   | 20 GB SSD
10-50 nodes      | 4 CPU  | 8 GB   | 40 GB SSD
50-100 nodes     | 8 CPU  | 16 GB  | 80 GB SSD
100+ nodes       | 16 CPU | 32 GB  | 160 GB NVMe
```

etcd performance is heavily dependent on disk I/O. Use SSDs at minimum, and NVMe drives for larger clusters. The etcd documentation recommends sustained sequential write IOPS of at least 50 for small clusters and 500+ for large ones.

## Network Topology Design

### Single-Site Multi-Master

For a single data center or cloud region:

```text
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │  192.168.1.100  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
        │   CP-1    │ │   CP-2    │ │   CP-3    │
        │  Rack A   │ │  Rack B   │ │  Rack C   │
        │ .1.10     │ │ .1.11     │ │ .1.12     │
        └───────────┘ └───────────┘ └───────────┘
              │              │              │
        ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
        │ Worker A1 │ │ Worker B1 │ │ Worker C1 │
        │ Worker A2 │ │ Worker B2 │ │ Worker C2 │
        └───────────┘ └───────────┘ └───────────┘
```

Distribute masters across different racks or power domains to protect against localized failures.

### Multi-Zone Multi-Master

For cloud deployments across availability zones:

```text
Zone A              Zone B              Zone C
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│    CP-1      │   │    CP-2      │   │    CP-3      │
│  Workers     │   │  Workers     │   │  Workers     │
│  Storage     │   │  Storage     │   │  Storage     │
└──────────────┘   └──────────────┘   └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                  Cross-Zone LB
```

## Implementation

### Step 1: Generate Secrets

Start by generating the cluster secrets that will be shared across all control plane nodes:

```bash
# Generate cluster secrets
talosctl gen secrets -o secrets.yaml

# Generate configuration from secrets
talosctl gen config my-cluster https://192.168.1.100:6443 \
  --with-secrets secrets.yaml \
  --output-dir _out
```

Store `secrets.yaml` securely. It contains the CA certificates and keys used by the entire cluster.

### Step 2: Configure the Load Balancer

Whether using Talos VIP or an external load balancer, the endpoint must be stable and highly available:

```yaml
# controlplane-vip-patch.yaml
machine:
  network:
    interfaces:
      - interface: eth0
        dhcp: true
        vip:
          ip: 192.168.1.100
          equinixMetal:
            apiToken: ""  # Only for Equinix Metal
```

For an external HAProxy setup:

```text
# haproxy.cfg
global
    maxconn 2048

defaults
    mode tcp
    timeout connect 5s
    timeout client 30s
    timeout server 30s

frontend k8s-api
    bind *:6443
    default_backend k8s-api-backend

backend k8s-api-backend
    balance roundrobin
    option tcp-check
    server cp1 192.168.1.10:6443 check inter 5s fall 3 rise 2
    server cp2 192.168.1.11:6443 check inter 5s fall 3 rise 2
    server cp3 192.168.1.12:6443 check inter 5s fall 3 rise 2
```

### Step 3: Configure Control Plane Nodes

Create comprehensive control plane configuration:

```yaml
# cp-master-patch.yaml
machine:
  install:
    disk: /dev/sda
    image: ghcr.io/siderolabs/installer:v1.6.0
  certSANs:
    - 192.168.1.100
    - 192.168.1.10
    - 192.168.1.11
    - 192.168.1.12
  kubelet:
    extraArgs:
      rotate-server-certificates: "true"
    nodeIP:
      validSubnets:
        - 192.168.1.0/24

cluster:
  controlPlane:
    endpoint: https://192.168.1.100:6443

  # etcd configuration for multi-master
  etcd:
    advertisedSubnets:
      - 192.168.1.0/24
    extraArgs:
      heartbeat-interval: "500"
      election-timeout: "5000"
      auto-compaction-mode: periodic
      auto-compaction-retention: "5m"
      quota-backend-bytes: "8589934592"

  # API server configuration
  apiServer:
    certSANs:
      - 192.168.1.100
    extraArgs:
      # Admission control
      enable-admission-plugins: "NodeRestriction,PodSecurity"
      # Audit logging
      audit-log-maxage: "30"
      audit-log-maxbackup: "3"
      audit-log-maxsize: "100"
      # Performance tuning for larger clusters
      max-requests-inflight: "400"
      max-mutating-requests-inflight: "200"

  # Controller manager configuration
  controllerManager:
    extraArgs:
      node-monitor-period: "5s"
      node-monitor-grace-period: "20s"
      pod-eviction-timeout: "30s"
      terminated-pod-gc-threshold: "100"

  # Scheduler configuration
  scheduler:
    extraArgs:
      bind-address: "0.0.0.0"

  # Do not schedule workloads on control plane nodes
  allowSchedulingOnControlPlanes: false

  # Network configuration
  network:
    cni:
      name: custom
      urls:
        - https://raw.githubusercontent.com/cilium/cilium/v1.14.5/install/kubernetes/quick-install.yaml
    podSubnets:
      - 10.244.0.0/16
    serviceSubnets:
      - 10.96.0.0/12
```

### Step 4: Apply and Bootstrap

```bash
# Apply to all three control plane nodes
for i in 10 11 12; do
  talosctl apply-config --insecure --nodes 192.168.1.$i \
    --file _out/controlplane.yaml \
    --config-patch @cp-master-patch.yaml
done

# Bootstrap from the first node
talosctl bootstrap --nodes 192.168.1.10 --talosconfig _out/talosconfig

# Wait for the cluster to form
talosctl health --nodes 192.168.1.10 --talosconfig _out/talosconfig

# Get kubeconfig
talosctl kubeconfig --nodes 192.168.1.100 --talosconfig _out/talosconfig
```

### Step 5: Verify Multi-Master Setup

```bash
# All three nodes should show as control plane
kubectl get nodes

# Check etcd cluster health
talosctl etcd members --nodes 192.168.1.10

# Verify all API servers are responding
for ip in 192.168.1.10 192.168.1.11 192.168.1.12; do
  echo "Testing $ip..."
  curl -sk https://$ip:6443/healthz
  echo
done

# Check controller manager and scheduler leaders
kubectl get lease -n kube-system kube-controller-manager -o yaml
kubectl get lease -n kube-system kube-scheduler -o yaml
```

## Operational Procedures

### Rolling Upgrades

Upgrade one master at a time to maintain availability:

```bash
# Pre-flight check
talosctl health --nodes 192.168.1.10

# Upgrade first master
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0

# Wait for it to rejoin and verify
talosctl etcd members --nodes 192.168.1.11
kubectl get nodes

# Repeat for remaining masters
talosctl upgrade --nodes 192.168.1.11 \
  --image ghcr.io/siderolabs/installer:v1.7.0
# ... verify ...
talosctl upgrade --nodes 192.168.1.12 \
  --image ghcr.io/siderolabs/installer:v1.7.0
```

### Scaling the Control Plane

To add masters (going from 3 to 5):

```bash
# Apply control plane config to new nodes
talosctl apply-config --insecure --nodes 192.168.1.13 \
  --file _out/controlplane.yaml --config-patch @cp-master-patch.yaml
talosctl apply-config --insecure --nodes 192.168.1.14 \
  --file _out/controlplane.yaml --config-patch @cp-master-patch.yaml

# Update the load balancer to include new nodes
# Verify expanded cluster
talosctl etcd members --nodes 192.168.1.10
```

To remove masters (going from 5 to 3):

```bash
# Remove etcd member first
talosctl etcd remove-member --nodes 192.168.1.10 <member-id>

# Drain and reset the node
kubectl drain cp-5 --ignore-daemonsets --delete-emptydir-data
talosctl reset --nodes 192.168.1.14 --graceful
```

### etcd Backup Strategy

```bash
# Daily backup script
talosctl etcd snapshot /backups/etcd-$(date +%Y%m%d-%H%M).snapshot \
  --nodes 192.168.1.10

# Verify the backup
ls -la /backups/etcd-*.snapshot

# Keep 7 days of backups
find /backups -name "etcd-*.snapshot" -mtime +7 -delete
```

## Anti-Patterns to Avoid

1. **Running 2 control plane nodes** - This is worse than 1 node because you need both for quorum, doubling your failure exposure
2. **Uneven resource allocation** - All masters should have identical resources
3. **Scheduling workloads on masters** - Keep masters dedicated to control plane duties
4. **Skipping health checks during upgrades** - Always verify cluster health between each master upgrade
5. **Ignoring etcd disk performance** - Slow disks cause cascading failures through timeout-triggered leader elections

## Monitoring Multi-Master Health

```bash
# Quick health check script
echo "=== Node Status ==="
kubectl get nodes

echo "=== etcd Members ==="
talosctl etcd members --nodes 192.168.1.10

echo "=== Component Status ==="
kubectl get componentstatuses 2>/dev/null || echo "Deprecated, checking pods instead"
kubectl get pods -n kube-system -l tier=control-plane

echo "=== Leader Elections ==="
kubectl get lease -n kube-system
```

## Conclusion

A well-designed multi-master architecture on Talos Linux provides the fault tolerance and scalability that production workloads demand. By following the principles of odd-numbered masters, geographic distribution, consistent configuration, and load-balanced access, you build a cluster that can survive individual node failures without any impact on availability. Talos Linux's immutable design eliminates the configuration drift problem that undermines multi-master setups in other distributions, making it an ideal foundation for critical infrastructure.
