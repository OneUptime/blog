# How to Wipe Disks and Partitions in Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Disk Management, Partition, Node Reset, Kubernetes Operations

Description: A step-by-step guide to wiping disks and partitions in Talos Linux, covering full resets, selective wipes, and safe recovery procedures.

---

There are plenty of reasons you might need to wipe disks or partitions on a Talos Linux node. Maybe you are decommissioning a node, repurposing hardware, troubleshooting disk corruption, or simply starting fresh after a failed installation. Whatever the reason, Talos Linux provides controlled ways to wipe disk data without needing shell access or booting into a recovery environment.

## Understanding Talos Disk Layout

Before wiping anything, it helps to know what Talos puts on the disk during installation. A standard Talos installation creates several partitions:

```text
Standard Talos Disk Layout:
  /dev/sda1 - EFI (boot assets for current UEFI/systemd-boot installs)
  /dev/sda2 - META (metadata key-value store)
  /dev/sda3 - STATE (machine configuration, certificates)
  /dev/sda4 - EPHEMERAL (Kubernetes data, container images, pods)
```

Older GRUB-based installs, legacy BIOS installs, or upgraded nodes can also have BIOS and BOOT partitions. On those systems, BOOT contains GRUB configuration and Talos boot assets such as `vmlinuz` and `initramfs`.

Each partition serves a different purpose, and depending on your goal, you may want to wipe all of them or only specific ones.

## Using talosctl reset for a Full Wipe

The most common way to wipe a Talos node is the `talosctl reset` command. This command removes the node from the Kubernetes cluster and wipes the disk partitions.

```bash
# Full graceful reset - removes the node from the cluster first

talosctl reset --nodes 192.168.1.10 --graceful

# Full reset without draining workloads first
talosctl reset --nodes 192.168.1.10 --graceful=false
```

A graceful reset will first cordon and drain the node in Kubernetes, remove the node from etcd (if it is a control plane node), and then wipe the disk. A non-graceful reset skips the drain step, which is useful when the node is already unreachable by the Kubernetes API.

By default, `talosctl reset` wipes the node and shuts it down unless you pass `--reboot`. Current Talos versions default to `--wipe-mode all`, which wipes the system disk and user disks, so a full reset can leave the machine unable to boot from disk until Talos is reinstalled or booted from ISO/PXE. If you only want to clear Talos state while preserving the bootable installation, use a selective wipe instead.

## Selective Partition Wipes

Sometimes you do not want to wipe everything. For example, you might want to clear the EPHEMERAL partition (which holds Kubernetes workload data) while keeping the STATE partition (which holds the machine configuration). This lets you rebuild the node's runtime environment without losing its identity.

```bash
# Wipe only the EPHEMERAL partition
talosctl reset --nodes 192.168.1.10 --graceful \
  --system-labels-to-wipe EPHEMERAL

# Wipe both STATE and EPHEMERAL
talosctl reset --nodes 192.168.1.10 --graceful \
  --system-labels-to-wipe STATE \
  --system-labels-to-wipe EPHEMERAL
```

The `--system-labels-to-wipe` flag lets you specify exactly which partitions to wipe. You can include one or more of the following labels: `STATE`, `EPHEMERAL`, `META`.

### When to Wipe Only EPHEMERAL

Wiping only the EPHEMERAL partition is useful when:

- Container runtime data has become corrupted
- The node is running out of disk space due to image accumulation
- Pods are stuck in a bad state and a fresh start is needed
- You want to clear etcd data on a control plane node without losing the machine configuration

### When to Wipe STATE

Wiping the STATE partition makes sense when:

- You want to change the node's role (switch from control plane to worker)
- The machine configuration has become corrupted
- You are reusing the hardware for a different cluster

## Wiping Disks for Reinstallation

If you want to completely start over, including rewriting boot assets and reinstalling Talos from scratch, plan for a reinstall from ISO, PXE, or another boot asset after the reset. A full reset can wipe the bootable installation, while a reinstall writes everything fresh.

```bash
# To do a complete reinstall, first reset the node and reboot into external install media
talosctl reset --nodes 192.168.1.10 --graceful=false --reboot

# Then boot the node from a Talos ISO or PXE
# and apply a fresh machine configuration
talosctl apply-config --nodes 192.168.1.10 \
  --file worker.yaml --insecure
```

Alternatively, if you have physical access or console access to the machine, you can boot from the Talos ISO and perform a fresh installation, which will repartition the entire disk.

## Wiping Additional Data Disks

Talos nodes may have additional disks beyond the system disk. These are often used for persistent volumes, local storage, or Ceph/Rook storage backends. Talos provides user volumes and raw volumes through machine configuration, and it provides `talosctl wipe disk` for block devices that are no longer used as a volume.

```yaml
# Machine configuration snippet to create a secondary user volume
apiVersion: v1alpha1
kind: UserVolumeConfig
name: storage
provisioning:
  diskSelector:
    match: disk.dev_path == '/dev/sdb'
  minSize: 100GB
```

If you need to wipe a secondary disk or partition that was previously configured as a Talos volume, first remove the matching volume configuration from the machine configuration and make sure Kubernetes is no longer using it. Then wipe the device with `talosctl wipe disk`:

```bash
# Wipe a block device or partition that is no longer used as a Talos volume
talosctl wipe disk sdb1 --nodes 192.168.1.10 --drop-partition
```

If the disk is still actively used by Kubernetes and cannot be removed from Talos volume management first, a privileged pod can be used as a last resort to clear the partition table:

```yaml
# Kubernetes DaemonSet to wipe a specific disk on specific nodes
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: disk-wiper
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: disk-wiper
  template:
    metadata:
      labels:
        app: disk-wiper
    spec:
      nodeSelector:
        kubernetes.io/hostname: worker-01
      containers:
        - name: wiper
          image: alpine:3.19
          command:
            - sh
            - -c
            # Wipe the first 10MB of the disk to remove partition table
            - "dd if=/dev/zero of=/dev/sdb bs=1M count=10 && sleep infinity"
          securityContext:
            privileged: true
          volumeMounts:
            - name: dev
              mountPath: /dev
      volumes:
        - name: dev
          hostPath:
            path: /dev
```

This approach should be used carefully. Make sure you are targeting the correct disk and the correct node.

## Verifying Disk State After a Wipe

After wiping, you should verify that the disk is in the expected state.

```bash
# Check disk status after a reset
talosctl get disks --nodes 192.168.1.10

# Check partition information
talosctl get discoveredvolumes --nodes 192.168.1.10

# Check mount points
talosctl get mountstatus --nodes 192.168.1.10
```

If the node has been selectively reset and rebooted, the wiped volumes should be recreated or absent depending on what you wiped. If you did a full reset, you may need to boot from ISO or PXE before `talosctl` can report the disk state again.

## Safety Considerations

Wiping disks is a destructive operation, and there are a few things to keep in mind:

1. **Always drain workloads first.** Use the `--graceful` flag with `talosctl reset` to ensure Kubernetes has time to reschedule pods to other nodes before the wipe happens.

2. **Back up etcd before wiping control plane nodes.** If you are wiping a control plane node, make sure you have an etcd snapshot. Losing quorum can bring down the entire cluster.

```bash
# Take an etcd snapshot before wiping a control plane node
talosctl etcd snapshot /tmp/etcd-backup.snapshot --nodes 192.168.1.10
```

3. **Never wipe more than one control plane node at a time.** If your cluster has three control plane nodes, wiping two simultaneously will cause loss of etcd quorum.

4. **Keep copies of machine configurations.** After a full wipe, you will need to re-apply the machine configuration. Having these files in version control or a configuration management system is essential.

5. **Verify node count before wiping.** Make sure your cluster has enough capacity to handle the workloads that will be displaced when the node goes down.

```bash
# Check cluster node status before starting a wipe
kubectl get nodes
kubectl top nodes
```

## Automating Disk Wipes for Fleet Operations

If you manage a large fleet of Talos nodes and need to wipe multiple nodes (for example, during a hardware refresh cycle), you can script the process:

```bash
#!/bin/bash
# Script to sequentially reset worker nodes

NODES=("192.168.1.20" "192.168.1.21" "192.168.1.22")

for NODE in "${NODES[@]}"; do
  echo "Resetting node $NODE..."

  # Drain the node in Kubernetes first
  kubectl drain "worker-$(echo $NODE | tr '.' '-')" \
    --ignore-daemonsets --delete-emptydir-data

  # Reset the node
  talosctl reset --nodes "$NODE" --graceful --wait

  echo "Node $NODE has been reset. Waiting 30 seconds..."
  sleep 30
done

echo "All nodes have been reset."
```

Process nodes one at a time to avoid overwhelming the cluster. For control plane nodes, even more caution is needed.

## Conclusion

Wiping disks and partitions in Talos Linux is straightforward once you understand the partition layout and the tools available. The `talosctl reset` command handles most use cases, from full wipes to selective partition cleaning. Always take precautions with backups and capacity planning before wiping any node, and use the graceful reset option whenever possible to minimize disruption to running workloads.
