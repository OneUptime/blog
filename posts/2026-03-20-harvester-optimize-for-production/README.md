# How to Optimize Harvester for Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Production, Performance, Optimization

Description: A comprehensive guide to optimizing your Harvester cluster for production workloads, covering performance tuning, reliability hardening, and operational best practices.

## Introduction

Running Harvester in production requires more than a basic installation. Production optimization involves hardware tuning (BIOS settings, NUMA topology), network optimization (dedicated NICs, jumbo frames), storage performance (Longhorn tuning, NVMe optimization), and operational practices (monitoring, backups, capacity planning). This guide provides a comprehensive checklist for production-grade Harvester deployments.

## Production Readiness Checklist

```text
Hardware:
  ✓ At least 3 nodes for HA
  ✓ IOMMU enabled (for future PCI passthrough)
  ✓ Consistent hardware across nodes
  ✓ Redundant power supplies
  ✓ ECC memory

Networking:
  ✓ Dedicated management NIC
  ✓ Dedicated storage NIC with jumbo frames (MTU 9000)
  ✓ Dedicated VM NIC
  ✓ NIC bonding for redundancy
  ✓ Managed switches with VLAN support

Storage:
  ✓ NVMe SSDs for OS and VM workloads
  ✓ Additional HDDs for bulk storage (tiered storage)
  ✓ Longhorn replica count = 3
  ✓ External backup target configured

Operations:
  ✓ Monitoring enabled (Prometheus + Grafana)
  ✓ Alerting configured
  ✓ Log forwarding configured
  ✓ Backup schedule established
  ✓ DR plan documented and tested
```

## Step 1: BIOS/UEFI Performance Settings

```text
Recommended BIOS Settings:
├── Performance Profile: Maximum Performance
├── CPU Power Management: High Performance (disable C-states)
├── NUMA: Enabled
├── Intel Turbo Boost / AMD Precision Boost: Enabled
├── Hyper-Threading: Enabled
├── Memory: XMP/DOCP profile enabled
├── PCIe Link Speed: Gen4 (if supported)
├── SATA Mode: AHCI
└── Fan Control: Performance Mode
```

For CPU power management on the host OS, use a method that is supported by your Harvester image and hardware vendor, and make sure the change is persisted through Harvester's configuration lifecycle. Harvester's operating system is immutable, so ad-hoc host tuning can be lost after reboot or upgrade if it is not managed persistently.

## Step 2: Kernel Tuning for Production

```bash
# Harvester uses an immutable OS. Validate runtime tunings first, then persist
# the equivalent changes through Harvester configuration instead of editing /etc directly.

sudo sysctl -w net.core.rmem_max=134217728
sudo sysctl -w net.core.wmem_max=134217728
sudo sysctl -w net.ipv4.tcp_rmem="4096 65536 134217728"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 134217728"
sudo sysctl -w net.core.netdev_max_backlog=5000
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr
sudo sysctl -w vm.swappiness=10
sudo sysctl -w vm.dirty_ratio=60
sudo sysctl -w vm.dirty_background_ratio=5
sudo sysctl -w vm.min_free_kbytes=65536
sudo sysctl -w fs.file-max=2097152
sudo sysctl -w fs.inotify.max_user_instances=8192
sudo sysctl -w fs.inotify.max_user_watches=524288

# Set I/O scheduler for NVMe to 'none' (already optimal on modern kernels)
for DISK in $(ls /sys/block/ | grep nvme); do
    echo none | sudo tee /sys/block/${DISK}/queue/scheduler
done
```

## Step 3: Longhorn Storage Optimization

```bash
# Harvester VM volumes use the harvester-longhorn StorageClass.
kubectl patch storageclass harvester-longhorn --type merge -p \
  '{"parameters":{"numberOfReplicas":"3","dataLocality":"best-effort"}}'

# Keep successful recurring job history manageable
kubectl -n longhorn-system patch settings.longhorn.io recurring-successful-jobs-history-limit --type merge -p '{"value":"3"}'

# Concurrent replica rebuilds (don't overload during node failures)
kubectl -n longhorn-system patch settings.longhorn.io concurrent-replica-rebuild-per-node-limit --type merge -p '{"value":"3"}'

# Storage overprovisioning - allow 200% of physical capacity
kubectl -n longhorn-system patch settings.longhorn.io storage-over-provisioning-percentage --type merge -p '{"value":"200"}'

# Storage minimal available percentage - keep 25% free
kubectl -n longhorn-system patch settings.longhorn.io storage-minimal-available-percentage --type merge -p '{"value":"25"}'
```

## Step 4: VM Resource Overcommit Policy

Harvester exposes cluster-wide overcommit through the `overcommit-config` setting rather than direct edits to the `KubeVirt` custom resource.

```bash
kubectl patch settings.harvesterhci.io overcommit-config --type merge -p \
  '{"value":"{\"cpu\":400,\"memory\":150,\"storage\":200}"}'

# Verify
kubectl get settings.harvesterhci.io overcommit-config -o yaml
```

## Step 5: Network Performance Tuning

Harvester manages VM and storage networking through cluster networks and the `storage-network` setting, so change MTU on the Harvester network configuration instead of raw `ethX` devices.

```bash
# Example: change the built-in mgmt network MTU to 9000
sudo nmcli con modify bond-mgmt 802-3-ethernet.mtu 9000
sudo nmcli con modify bridge-mgmt 802-3-ethernet.mtu 9000

# Optional: if mgmt uses a VLAN, update that profile as well
sudo nmcli con modify vlan-mgmt 802-3-ethernet.mtu 9000

sudo nmcli device reapply mgmt-bo
sudo nmcli device reapply mgmt-br

# Tell Harvester about the new uplink MTU
kubectl annotate clusternetwork mgmt network.harvesterhci.io/uplink-mtu="9000" --overwrite

# Verify switch ports also support MTU 9000
ping -M do -s 8972 10.200.0.12
```

## Step 6: Configure Resource Reservations

Reserve resources for the host OS and Kubernetes system daemons:

```bash
sudo tee /var/lib/rancher/rke2/agent/etc/kubelet.conf.d/90-harvester-reservations.conf << 'EOF'
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
systemReserved:
  cpu: "1000m"
  memory: "2Gi"
  ephemeral-storage: "10Gi"
kubeReserved:
  cpu: "1000m"
  memory: "2Gi"
  ephemeral-storage: "10Gi"
evictionHard:
  memory.available: "500Mi"
  nodefs.available: "10%"
  nodefs.inodesFree: "5%"
cpuManagerPolicy: static
topologyManagerPolicy: best-effort
EOF

# Restart the appropriate RKE2 service on each node after the file is in place.
sudo systemctl restart rke2-server  # use rke2-agent on worker-only nodes
```

## Step 7: HA Configuration Validation

```bash
# Test that the cluster survives a single node failure
# Identify the current VIP holder
kubectl -n kube-system get svc ingress-expose \
    -o jsonpath='{.metadata.annotations.kube-vip\.io/vipHost}'; echo

# Simulate node failure
ssh rancher@192.168.1.11 "sudo systemctl stop rke2-server"

# Verify cluster remains operational
sleep 30
kubectl get nodes  # Should show node-01 as NotReady, others Ready
kubectl get vmi -A  # VMs should still be running

# Restore the node
ssh rancher@192.168.1.11 "sudo systemctl start rke2-server"
kubectl wait node/harvester-node-01 --for=condition=Ready --timeout=300s
```

## Step 8: Production Monitoring Thresholds

```promql
# Alert thresholds for production Harvester

# CPU Overload (> 80% for 10 minutes)
avg by (node) (1 - rate(node_cpu_seconds_total{mode="idle"}[5m])) > 0.80

# Memory Pressure (> 90%)
1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.90

# Storage Low (< 20% free)
1 - (node_filesystem_free_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) > 0.80

# Longhorn Degraded Volumes
longhorn_volume_robustness{state="degraded"} == 1

# etcd Disk Latency (> 10ms is warning, > 25ms is critical)
histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m])) > 0.01
```

## Conclusion

Production-optimizing Harvester is an iterative process that spans hardware selection, OS tuning, storage configuration, and operational practices. The most impactful optimizations are typically: dedicated NICs with traffic separation, NVMe storage with appropriate Longhorn settings, and proper resource reservations to prevent noisy-neighbor problems. Establish your monitoring and alerting early, run thorough HA testing before go-live, and regularly review capacity utilization to stay ahead of resource exhaustion. A well-tuned Harvester cluster delivers excellent VM density and performance while maintaining the operational simplicity that makes HCI attractive.
