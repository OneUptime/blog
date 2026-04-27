# How to Optimize Longhorn Performance for Production - Optimize Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Performance, Production, Optimization

Description: A comprehensive guide for tuning Longhorn settings, hardware configuration, and Kubernetes parameters to achieve optimal storage performance in production environments.

## Introduction

Running Longhorn in production requires careful performance tuning to achieve the best balance of throughput, latency, reliability, and resource utilization. This guide brings together all the key performance optimization techniques, from hardware selection and Longhorn settings to Kubernetes scheduling and monitoring.

## Performance Optimization Framework

Production Longhorn optimization covers five areas:
1. **Hardware**: Disk type, network, and node sizing
2. **Data Locality**: Minimize network I/O
3. **Replication**: Balance durability with performance
4. **Filesystem & Mount Options**: Tune for your workload pattern
5. **Monitoring**: Detect bottlenecks early

## Layer 1: Hardware Optimization

### Disk Selection and Configuration

```bash
# Check disk types on each node

lsblk -d -o NAME,TYPE,ROTA,SIZE,MODEL
# ROTA=0 means SSD/NVMe

# For best performance, use dedicated NVMe SSDs for Longhorn
# Mount NVMe drives separately from the OS disk

# Format dedicated disks
mkfs.ext4 -L longhorn-nvme -E lazy_itable_init=0,lazy_journal_init=0 /dev/nvme1n1
mkdir -p /mnt/nvme-storage
echo '/dev/nvme1n1 /mnt/nvme-storage ext4 defaults,noatime,nodiratime 0 2' >> /etc/fstab
mount -a
```

### Tag Disks for Performance-Sensitive Workloads

```bash
# In Longhorn UI: Node → Edit → Disk → Add Tags "nvme", "fast"
# Or via node patch (after disk is registered)
```

### Network Considerations

```bash
# Check network bandwidth between nodes (affects replica sync speed)
# Install iperf3 for testing
apt-get install -y iperf3

# Test between nodes (run server on one, client on another)
# Node 1 (server):
iperf3 -s

# Node 2 (client):
iperf3 -c <node1-ip> -t 30 -P 8
# Should show close to network line rate (e.g., 9 Gbps on 10GbE)
```

## Layer 2: Data Locality

```yaml
# storageclass-production.yaml - Production-optimized storage class
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: longhorn-production
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: driver.longhorn.io
allowVolumeExpansion: true
reclaimPolicy: Retain
parameters:
  numberOfReplicas: "3"
  # Keep one replica on the same node as the pod
  dataLocality: "best-effort"
  diskSelector: "nvme"
  fsType: "ext4"
  staleReplicaTimeout: "30"
mountOptions:
  - noatime
  - nodiratime
```

```bash
kubectl apply -f storageclass-production.yaml
```

## Layer 3: Longhorn Global Settings Tuning

```bash
# 1. Optimize concurrent operations
# Allow more concurrent replica rebuilds on powerful nodes
kubectl patch settings.longhorn.io concurrent-replica-rebuild-per-node-limit \
  -n longhorn-system \
  --type merge \
  -p '{"value": "5"}'

# 2. Reduce unnecessary snapshot cleanup impact
kubectl patch settings.longhorn.io auto-cleanup-system-generated-snapshot \
  -n longhorn-system \
  --type merge \
  -p '{"value": "true"}'

# 3. Tune snapshot frequency for recurring jobs
# Balance RPO vs performance (avoid too-frequent snapshots)

# 4. Configure backup target bandwidth (if applicable)
# Limit backup bandwidth to avoid impacting production I/O
kubectl patch settings.longhorn.io backup-target-poll-interval \
  -n longhorn-system \
  --type merge \
  -p '{"value": "300"}'  # Check for new backups every 5 minutes

# 5. Optimize storage over-provisioning for your workload pattern
kubectl patch settings.longhorn.io storage-over-provisioning-percentage \
  -n longhorn-system \
  --type merge \
  -p '{"value": "150"}'

# 6. Ensure sufficient minimum available storage
kubectl patch settings.longhorn.io storage-minimal-available-percentage \
  -n longhorn-system \
  --type merge \
  -p '{"value": "25"}'
```

## Layer 4: Resource Management

### Set Priority Classes

```yaml
# priority-classes.yaml - Ensure Longhorn components have high priority
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: longhorn-critical
value: 2000000
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-app
value: 1000000
globalDefault: true
```

```bash
kubectl apply -f priority-classes.yaml

# Apply to Longhorn via settings
kubectl patch settings.longhorn.io priority-class \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhorn-critical"}'
```

### Configure Resource Requests for Longhorn Manager

```yaml
# Ensure Longhorn manager has guaranteed resources
# This is typically configured during Helm installation
longhornManager:
  resources:
    requests:
      cpu: "250m"
      memory: "256Mi"
    limits:
      cpu: "2000m"
      memory: "1Gi"
```

## Layer 5: Replica Placement Strategy

```bash
# Enable zone anti-affinity for multi-zone clusters
kubectl patch settings.longhorn.io replica-zone-soft-anti-affinity \
  -n longhorn-system \
  --type merge \
  -p '{"value": "false"}'  # Strict zone anti-affinity

# Set appropriate replica replenishment delay
# Too short: unnecessary rebuilds on transient failures
# Too long: extended degraded state after real failures
kubectl patch settings.longhorn.io replica-replenishment-wait-interval \
  -n longhorn-system \
  --type merge \
  -p '{"value": "300"}'  # Wait 5 minutes before rebuilding
```

## Continuous Performance Monitoring

### Key Prometheus Metrics for Performance

```promql
# Volume read/write latency (gauge, nanoseconds)
longhorn_volume_read_latency
longhorn_volume_write_latency

# IOPS per volume (gauge)
longhorn_volume_read_iops
longhorn_volume_write_iops

# Throughput (gauge, bytes/s)
longhorn_volume_read_throughput
longhorn_volume_write_throughput

# Disk free-space alert threshold (alert when free drops below 25%)
(longhorn_disk_capacity_bytes - longhorn_disk_usage_bytes) / longhorn_disk_capacity_bytes < 0.25
```

### Performance Baseline Checklist

```bash
# Run this checklist after each major change to verify performance baseline

echo "=== Longhorn Performance Baseline ==="

# 1. Check all volumes are healthy
DEGRADED=$(kubectl get volumes.longhorn.io -n longhorn-system \
  -o json | jq '[.items[] | select(.status.robustness != "healthy")] | length')
echo "Degraded volumes: $DEGRADED (target: 0)"

# 2. Check disk utilization
echo "Disk utilization per node:"
kubectl get nodes.longhorn.io -n longhorn-system \
  -o custom-columns="NODE:.metadata.name,SCHEDULABLE:.spec.allowScheduling"

# 3. Check backup health
BACKUP_VOLUMES=$(kubectl get backupvolumes.longhorn.io -n longhorn-system \
  --no-headers | wc -l)
echo "Volumes with backups: $BACKUP_VOLUMES"

# 4. Check for orphaned replicas
ORPHANS=$(kubectl get orphans.longhorn.io -n longhorn-system \
  --no-headers 2>/dev/null | wc -l)
echo "Orphaned replicas: $ORPHANS (target: 0)"
```

## Production Readiness Checklist

Before going live with Longhorn in production:

- [ ] NVMe or SSD disks with dedicated mount points configured
- [ ] At least 3 Longhorn nodes for 3-replica volumes
- [ ] External backup target configured (S3, NFS, Azure, or GCS)
- [ ] Recurring backup jobs applied to all critical volumes
- [ ] Priority classes set for Longhorn components
- [ ] Prometheus monitoring with alerting rules
- [ ] Grafana dashboard deployed
- [ ] Disaster recovery procedure documented and tested
- [ ] Volume expansion tested
- [ ] Restore procedure tested with actual backup

## Conclusion

Optimizing Longhorn for production requires a holistic approach that covers hardware selection, Kubernetes scheduling, Longhorn-specific settings, and continuous monitoring. The most impactful optimizations are typically using fast SSDs or NVMe drives, enabling data locality to reduce network I/O, setting appropriate priority classes to protect storage infrastructure, and configuring robust backup and monitoring. Start with these fundamentals, measure your baseline performance, and incrementally tune from there based on your specific workload patterns.
