# How to Optimize Harvester for Production - Optimization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Production, Optimization, HCI, Performance, Kubernetes, SUSE Rancher

Description: Learn how to optimize Harvester HCI for production deployments including hardware configuration, Longhorn tuning, network optimization, and reliability settings for maximum VM density and performance.

---

Running Harvester in production requires hardware selection, operating system tuning, and Longhorn and Kubernetes configuration optimization. This guide provides a production-readiness checklist and configuration recommendations.

---

## Hardware Sizing Recommendations

| Component | Minimum | Recommended |
|---|---|---|
| CPU | 16 cores | 32+ cores (AMD EPYC or Intel Xeon) |
| RAM | 64GB | 128GB+ (64GB per 10 VMs) |
| Storage | 500GB local SSD/NVMe (5,000+ random IOPS per disk) | 1TB+ NVMe SSD (dedicated for Longhorn) |
| Network | 10Gbps Ethernet | 25Gbps (management) + 25Gbps (storage) |
| Nodes | 3 | 5+ for HA |

---

## Step 1: OS-Level Tuning

Persist these settings on each Harvester node with a CloudInit resource, then reboot the affected nodes:

```bash
cat <<'EOF' | kubectl apply -f -
apiVersion: node.harvesterhci.io/v1beta1
kind: CloudInit
metadata:
  name: harvester-sysctl
spec:
  matchSelector: {}
  filename: 99-harvester-sysctl.yaml
  contents: |
    os:
      sysctls:
        net.core.rmem_max: "134217728"
        net.core.wmem_max: "134217728"
        net.core.netdev_max_backlog: "5000"
        vm.dirty_ratio: "10"
        vm.dirty_background_ratio: "5"
        vm.swappiness: "10"
        fs.file-max: "2097152"
        fs.inotify.max_user_watches: "524288"
        fs.inotify.max_user_instances: "1024"
EOF
```

---

## Step 2: Longhorn Tuning for Production

```bash
# Set storage minimal available to 15% (Longhorn stops scheduling at this threshold)
kubectl patch settings.longhorn.io storage-minimal-available-percentage \
  -n longhorn-system --type merge -p '{"value":"15"}'

# Limit concurrent rebuilds to protect production performance
kubectl patch settings.longhorn.io concurrent-replica-rebuild-per-node-limit \
  -n longhorn-system --type merge -p '{"value":"1"}'

# Set the priority class for Longhorn system-managed components
# Detach volumes before changing this setting so Longhorn can restart components cleanly
kubectl patch settings.longhorn.io priority-class \
  -n longhorn-system --type merge -p '{"value":"longhorn-critical"}'
```

---

## Step 3: Network Separation

Configure separate VLANs for different traffic types:

```yaml
# In Harvester UI: Networks > Cluster Networks and Networks > VM Networks

# Recommended traffic separation:
# mgmt: Harvester API, Rancher integration, and control-plane traffic
# storage-network on a custom cluster network: Longhorn replication traffic
# vm-migration-network on a custom cluster network: live migration traffic
# VM Networks on separate VLANs: production and development/testing workloads
```

---

## Step 4: Configure Resource Overcommit Ratios

```bash
# Set global CPU, memory, and storage overcommit percentages
# CPU 200 = 2x overcommit, Memory 150 = 1.5x, Storage 200 = 2x
kubectl patch settings.harvesterhci.io overcommit-config --type merge -p \
  '{"value":"{\"cpu\":200,\"memory\":150,\"storage\":200}"}'
```

---

## Step 5: Enable Live Migration Performance

```bash
# Configure a dedicated migration network to isolate live migration traffic
# Example: use an existing custom cluster network named vm-migration
kubectl patch settings.harvesterhci.io vm-migration-network --type merge -p \
  '{"value":"{\"vlan\":100,\"clusterNetwork\":\"vm-migration\",\"range\":\"192.168.1.0/24\"}"}'
```

---

## Production Readiness Checklist

- [ ] Minimum 3 nodes (5+ recommended for HA)
- [ ] Dedicated NVMe SSDs for Longhorn
- [ ] 10Gbps+ network interfaces
- [ ] Separate network interfaces for storage and management
- [ ] BIOS hardware-assisted virtualization enabled; enable VT-d/SR-IOV if required
- [ ] OS sysctl tuning applied
- [ ] Longhorn priority class configured
- [ ] Prometheus monitoring and alerting enabled
- [ ] Backup target configured (S3 or NFS)
- [ ] Rancher integration configured
- [ ] Tested live migration successfully

---

## Best Practices

- Never run a 2-node Harvester cluster in production - an HA etcd control plane requires an odd quorum.
- Monitor VM density per node and alert when it exceeds planned capacity.
- Schedule regular maintenance windows for OS updates using Harvester's Maintenance Mode workflow.
