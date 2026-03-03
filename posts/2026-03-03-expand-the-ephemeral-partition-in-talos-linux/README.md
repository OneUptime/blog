# How to Expand the EPHEMERAL Partition in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, EPHEMERAL Partition, Disk Expansion, Storage, Kubernetes

Description: Step-by-step guide to expanding the EPHEMERAL partition in Talos Linux by growing the underlying disk and triggering repartitioning through upgrade or reinstall.

---

The EPHEMERAL partition is where Talos Linux stores all the data that Kubernetes needs at runtime: container images, running pod data, logs, and temporary files. When this partition fills up, you get pod evictions, scheduling failures, and general cluster instability. Expanding the EPHEMERAL partition is a common operational task, and this guide walks you through the process for different environments.

## Understanding the EPHEMERAL Partition

During installation, Talos creates several partitions on the system disk. The EPHEMERAL partition is always the last one, and it automatically fills all remaining space on the disk after the other partitions (EFI/BIOS, BOOT, META, STATE) are created.

```text
Typical Talos Disk Layout:
  EFI/BIOS - ~100MB / ~1MB
  BOOT     - ~1GB
  META     - ~1MB
  STATE    - ~100MB
  EPHEMERAL - everything else (this is what we want to expand)
```

The EPHEMERAL partition holds:
- Container images pulled by the container runtime
- Writable layers of running containers
- Container logs
- EmptyDir volumes used by pods
- etcd data (on control plane nodes)
- kubelet working data

## When to Expand

You should consider expanding the EPHEMERAL partition when:

- Disk usage consistently stays above 70-80%
- You are seeing pod evictions due to disk pressure
- You plan to run workloads with larger container images
- The cluster is growing and more pods will be scheduled on the node
- etcd data is growing on control plane nodes

Check current usage before deciding:

```bash
# Check EPHEMERAL partition usage
talosctl get mounts --nodes 192.168.1.10

# Look for the EPHEMERAL mount point
# Check the percentage used

# Also check Kubernetes disk pressure
kubectl describe node worker-01 | grep DiskPressure
```

## Expanding in Virtual Environments

The general process for expanding the EPHEMERAL partition in a virtual environment is:

1. Expand the underlying virtual disk
2. Trigger Talos to recognize the new space through an upgrade

### Step 1: Expand the Virtual Disk

The method for expanding the disk depends on your virtualization platform.

**Proxmox:**

```bash
# Expand the disk by 100GB
qm resize 100 scsi0 +100G

# Or set to a specific size
qm resize 100 scsi0 300G
```

**VMware vSphere:**

```bash
# Using govc CLI
govc vm.disk.change -vm talos-worker-01 -disk.key 2000 -size 300G

# Or use the vSphere UI:
# VM > Edit Settings > Hard Disk > increase size
```

**AWS EC2:**

```bash
# Modify the EBS volume size
aws ec2 modify-volume \
  --volume-id vol-0123456789abcdef0 \
  --size 300

# Wait for the modification to complete
aws ec2 describe-volumes-modifications \
  --volume-id vol-0123456789abcdef0
```

**Azure:**

```bash
# Resize a managed disk
az disk update \
  --resource-group my-rg \
  --name talos-worker-01-disk \
  --size-gb 300
```

**Google Cloud:**

```bash
# Resize a persistent disk
gcloud compute disks resize talos-worker-01-disk \
  --size=300GB --zone=us-central1-a
```

### Step 2: Trigger Repartitioning

After expanding the underlying disk, Talos needs to be told to use the new space. The EPHEMERAL partition will not grow automatically. You need to trigger a reinstall or upgrade, which causes Talos to repartition the disk.

```bash
# Option A: Upgrade to the same version (triggers repartitioning)
talosctl upgrade --nodes 192.168.1.10 \
  --image ghcr.io/siderolabs/installer:v1.7.0 \
  --preserve

# Option B: If already on the latest version, use the same image
# The --preserve flag keeps the machine configuration
```

The `--preserve` flag is important here. It tells Talos to keep the existing machine configuration and only update the system components. Without this flag, you would lose the machine configuration and need to re-apply it.

### Step 3: Verify the Expansion

After the node reboots, verify that the EPHEMERAL partition has grown:

```bash
# Check the new partition size
talosctl get mounts --nodes 192.168.1.10

# Compare with the previous size
# The EPHEMERAL partition should now reflect the larger disk
```

## Expanding on Bare Metal

On bare metal, expanding the system disk is more involved because you cannot simply click a button to add space. Your options are:

### Option A: Replace with a Larger Disk

1. Drain the node's workloads
2. Power down the server
3. Replace the disk with a larger one
4. Boot from a Talos ISO
5. Install Talos and apply the machine configuration

```bash
# Step 1: Drain the node
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data

# Steps 2-3: Physical disk replacement

# Step 4-5: Boot from ISO and apply config
talosctl apply-config --nodes 192.168.1.10 --file worker.yaml --insecure

# After installation, uncordon the node
kubectl uncordon worker-01
```

### Option B: Add a Secondary Disk

Instead of replacing the system disk, you can add a secondary disk and configure it for additional storage:

```yaml
machine:
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/mnt/extra-storage
```

This does not expand the EPHEMERAL partition itself, but it gives you additional storage that you can use for local persistent volumes, which takes pressure off the EPHEMERAL partition.

## Preparing the Node for Expansion

Before starting the expansion process, take these preparatory steps:

```bash
# Step 1: Check current disk usage
talosctl get mounts --nodes 192.168.1.10

# Step 2: Drain the node to minimize disruption
kubectl drain worker-01 --ignore-daemonsets --delete-emptydir-data

# Step 3: For control plane nodes, verify etcd health first
talosctl etcd status --nodes 192.168.1.10
talosctl etcd alarm list --nodes 192.168.1.10

# Step 4: Take an etcd snapshot if this is a control plane node
talosctl etcd snapshot /tmp/etcd-backup.snapshot --nodes 192.168.1.10
```

## Important Considerations

**Data on the EPHEMERAL partition is not preserved during repartitioning.** When you trigger an upgrade that causes repartitioning, the existing data on the EPHEMERAL partition may be wiped. This is why draining the node first is critical. Make sure all important data is either:
- Stored on persistent volumes backed by external storage
- Replicated across multiple nodes
- Backed up before the operation

**Control plane nodes need extra care.** Before expanding a control plane node's disk, verify that the cluster has quorum and that etcd is healthy. Never expand multiple control plane nodes simultaneously.

**The upgrade approach works because Talos repartitions on install/upgrade.** During the upgrade process, Talos writes new boot files and may repartition the disk. The EPHEMERAL partition, being the last partition, automatically expands to fill all available space.

## Automating Expansion for Multiple Nodes

If you need to expand EPHEMERAL partitions across many nodes, script the process:

```bash
#!/bin/bash
# Expand EPHEMERAL partitions on worker nodes
# Assumes virtual disks have already been expanded

NODES=("192.168.1.20" "192.168.1.21" "192.168.1.22")
TALOS_IMAGE="ghcr.io/siderolabs/installer:v1.7.0"

for NODE in "${NODES[@]}"; do
  echo "Processing node $NODE..."

  # Get the hostname for kubectl
  HOSTNAME=$(talosctl get hostname --nodes "$NODE" -o json | jq -r '.spec.hostname')

  # Drain the node
  echo "  Draining $HOSTNAME..."
  kubectl drain "$HOSTNAME" --ignore-daemonsets --delete-emptydir-data --timeout=300s

  # Trigger upgrade with preserve
  echo "  Upgrading $NODE to trigger repartitioning..."
  talosctl upgrade --nodes "$NODE" --image "$TALOS_IMAGE" --preserve --wait

  # Wait for the node to be ready
  echo "  Waiting for $HOSTNAME to be ready..."
  kubectl wait --for=condition=Ready "node/$HOSTNAME" --timeout=300s

  # Uncordon the node
  kubectl uncordon "$HOSTNAME"

  # Verify the new size
  echo "  New EPHEMERAL size:"
  talosctl get mounts --nodes "$NODE" | grep EPHEMERAL

  echo "  Done with $NODE"
  echo ""
done

echo "All nodes processed."
```

Process nodes one at a time to maintain cluster capacity and avoid disrupting workloads.

## Monitoring After Expansion

After expanding, set up monitoring to track disk usage trends:

```bash
# Verify immediate usage after expansion
talosctl get mounts --nodes 192.168.1.10

# Set up ongoing monitoring
kubectl describe node worker-01 | grep -A 3 "Allocated resources"
```

If you have Prometheus, verify the metrics reflect the new disk size:

```promql
# Should show a higher value after expansion
node_filesystem_size_bytes{mountpoint="/var"}
```

## Alternative: Reducing Disk Usage Instead of Expanding

Before expanding, consider whether you can reduce disk usage instead:

```yaml
# Configure aggressive image garbage collection
machine:
  kubelet:
    extraConfig:
      imageGCHighThresholdPercent: 70
      imageGCLowThresholdPercent: 60

      # Limit container log sizes
      containerLogMaxSize: "20Mi"
      containerLogMaxFiles: 3
```

Sometimes optimizing garbage collection thresholds and log rotation frees enough space to postpone or avoid disk expansion entirely.

## Conclusion

Expanding the EPHEMERAL partition in Talos Linux requires expanding the underlying disk and then triggering a Talos upgrade to repartition. The process is straightforward in virtual environments where disk expansion is a simple operation. On bare metal, adding a secondary disk or replacing the system disk are your options. Always drain the node first, take etcd backups for control plane nodes, and verify the expansion completed successfully before moving on to the next node.
