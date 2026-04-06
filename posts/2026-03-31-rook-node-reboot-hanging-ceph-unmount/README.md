# How to Handle Node Reboot Hanging Due to Ceph Volume Unmount Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Node, Reboot, Unmount

Description: Diagnose and fix Kubernetes node reboots hanging due to stuck Ceph volume unmounts, including kernel-level fixes and pod eviction strategies.

---

A common operational issue with Rook-Ceph is that nodes hang during reboot or shutdown because Ceph volumes (CephFS or RBD) cannot be unmounted cleanly. This occurs when pods using Ceph volumes are not gracefully terminated before the Ceph daemons stop, leaving kernel-level mounts in a stuck state.

## Symptoms

A node that is hanging during reboot shows these signs:
- `kubectl drain` hangs and times out on the node
- The node remains in `Ready` state for an unusually long time after shutdown is initiated
- SSH to the node shows the system is waiting for unmount operations
- `journalctl` on the node shows repeated mount-related errors

On the stuck node (via serial console or out-of-band access):

```bash
journalctl -xb | grep -E "ceph|mount|umount|rbd"
```

```text
systemd-shutdown[1]: Waiting for process: rbd-nbd
kernel: INFO: task kworker/u8:2:345 blocked for more than 120s.
kernel: Showing all locks held in the system
```

## Root Cause

When a node starts shutting down, Kubernetes begins pod eviction. However, if:
1. Pods using Ceph volumes are slow to terminate
2. The Ceph OSD or mon pods on the same node stop first
3. Kernel-level Ceph mounts lose their connection to the cluster

The kernel mount enters an uninterruptible wait state. Regular `umount` commands fail, and the system cannot complete shutdown.

## Prevention: Proper Drain Order

The safest approach is to ensure pods using Ceph volumes are evicted before Ceph daemon pods stop. Use pod disruption budgets and drain with sufficient timeout:

```bash
NODE="node-3"
kubectl cordon $NODE
kubectl drain $NODE \
  --ignore-daemonsets \
  --delete-emptydir-data \
  --timeout=600s \
  --grace-period=120
```

The `--grace-period=120` gives pods 2 minutes to shut down cleanly before force-killing.

## Identifying Stuck Mounts

If a node is already stuck, identify the problematic mounts from a working node:

```bash
# Check which PVCs are mounted on the stuck node
kubectl get pods -A -o wide | grep stuck-node-name

# Get mount details from node (if accessible)
ssh stuck-node "mount | grep -E 'ceph|rbd'"
```

```text
10.96.0.10:6789:/volumes/csi/csi-vol-xxx on /var/lib/kubelet/pods/xxx type ceph
/dev/rbd0 on /var/lib/kubelet/plugins/kubernetes.io/csi/xxx type ext4
```

## Forcefully Unmounting Stuck Mounts

If the node is accessible via SSH:

```bash
# List stuck mounts
ssh stuck-node "cat /proc/mounts | grep -E 'ceph|rbd'"

# Try lazy unmount first (detaches from filesystem hierarchy)
ssh stuck-node "sudo umount -l /var/lib/kubelet/pods/xxx/volumes/kubernetes.io~csi/xxx/mount"

# For RBD devices, try force unmount
ssh stuck-node "sudo umount -f /dev/rbd0"

# If still stuck, kill the process holding the mount
ssh stuck-node "sudo fuser -km /var/lib/kubelet/pods/xxx/volumes/"
```

## Detaching RBD Devices

For RBD (block device) mounts, unmap the device explicitly:

```bash
# List mapped RBD devices
ssh stuck-node "sudo rbd device list"
```

```text
id  pool        namespace  image                  snap  device
0   replicapool            csi-vol-abc123         -     /dev/rbd0
```

```bash
# Unmap the device
ssh stuck-node "sudo rbd device unmap /dev/rbd0"

# If unmap fails, force unmap
ssh stuck-node "sudo rbd device unmap --force /dev/rbd0"
```

## Kernel Module Cleanup

After unmounting, ensure the kernel does not retain stale state:

```bash
ssh stuck-node "sudo modprobe -r rbd"
ssh stuck-node "sudo modprobe -r ceph"
```

If modules are in use and cannot be removed, a hard reboot (via IPMI or power button) may be necessary.

## Configuring kubelet for Faster Pod Eviction

Prevent future hangs by configuring faster pod eviction on shutdown:

```yaml
# /etc/kubernetes/kubelet-config.yaml
shutdownGracePeriod: 30s
shutdownGracePeriodCriticalPods: 10s
```

Also configure the CSI driver with appropriate timeouts:

```yaml
# In the StorageClass
parameters:
  kernelMountOptions: "recover_session=clean"
```

The `recover_session=clean` option for CephFS mounts helps the kernel handle session recovery more gracefully.

## Monitoring for Stuck Unmounts

Set up monitoring to detect nodes that take too long to drain:

```bash
# Alert when drain takes more than 5 minutes
kubectl get events -A | grep -E "FailedMount|VolumeError|Timeout"
```

## Summary

Node reboot hanging due to stuck Ceph volume unmounts is caused by kernel-level Ceph mounts losing their connection to the cluster when Ceph daemons stop before pods using those volumes are evicted. Prevention requires draining the node with sufficient grace period before shutdown. Recovery from a stuck node involves lazy unmounting CephFS mounts, force unmapping RBD devices, and if necessary, a hard reboot. Configure `shutdownGracePeriod` in kubelet and use `recover_session=clean` for CephFS mounts to reduce the frequency of this issue.
