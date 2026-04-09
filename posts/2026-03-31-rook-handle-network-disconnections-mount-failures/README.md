# How to Handle Network Disconnections Causing Mount Failures in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Networking, Troubleshooting, CephFS, RBD

Description: Diagnose and resolve Ceph mount failures caused by network disconnections, covering kernel RBD, CephFS, and CSI driver reconnection behavior and recovery steps.

---

## How Network Disconnections Affect Mounts

When network connectivity to Ceph MONs or OSDs drops, mounted RBD devices and CephFS filesystems enter a "blocked" state. The kernel client retries indefinitely by default, meaning:

- Applications stall waiting for I/O to complete
- Mount appears frozen (df, ls commands hang)
- New mounts fail immediately
- Recovery is automatic once connectivity restores (if timeout settings allow)

## Diagnosing Mount Failures

Check for blocked I/O on mounted Ceph devices:

```bash
# Check for hung tasks
dmesg | grep -E "hung_task|blocked|ceph" | tail -20

# List processes with blocked I/O
ps aux | grep " D " | grep -v grep  # D = uninterruptible sleep

# Check ceph kernel client status
cat /sys/kernel/debug/ceph/*/osdc 2>/dev/null | head -20

# Verify RBD device connectivity
rbd status <pool>/<image>
```

For Kubernetes/CSI mounted volumes:

```bash
# Check for pending I/O in pods
kubectl exec -it <pod> -- ls /data 2>&1
# If this hangs, the volume I/O is blocked

# Check CSI node plugin logs
kubectl logs -n rook-ceph -l app=csi-rbdplugin --tail=50 | grep -E "error|timeout|disconnect"
kubectl logs -n rook-ceph -l app=csi-cephfsplugin --tail=50 | grep -E "error|timeout|mount"
```

## Kernel RBD Reconnection Behavior

Kernel RBD automatically reconnects to Ceph after network recovery. Key kernel parameters:

```bash
# Set OSD request timeout when mapping the RBD device (seconds before I/O error)
rbd map <pool>/<image> -o osd_request_timeout=60

# Or set globally in /etc/ceph/ceph.conf under [client]:
#     osd_request_timeout = 60
```

After network recovery, verify device reconnected:

```bash
# Check OSD map is current
cat /sys/kernel/debug/ceph/*/osdmap
cat /sys/kernel/debug/ceph/*/monmap

# Test I/O
dd if=/dev/rbd0 of=/dev/null bs=4k count=100 2>&1
```

## CephFS Mount Reconnection

CephFS mounts use the `recover_session=clean` or `recover_session=no` option:

```bash
# Mount with recover_session=clean (reconnects after client blocklisting, drops dirty state)
mount -t ceph mon1:6789,mon2:6789:/ /mnt/cephfs \
    -o name=admin,secretfile=/etc/ceph/admin.secret,recover_session=clean

# View reconnection logs
dmesg | grep ceph | grep -E "reconnect|recover|session" | tail -20
```

If CephFS remains stuck after connectivity returns:

```bash
# Force umount (requires no open files)
umount -l /mnt/cephfs  # Lazy umount if regular fails

# Remount
mount -t ceph mon1:6789:/ /mnt/cephfs -o name=admin,...
```

## Kubernetes CSI Volume Recovery

CSI volumes in Kubernetes require special handling - pods may need restart after prolonged disconnection:

```bash
# Force pod restart to trigger CSI remount
kubectl rollout restart deployment/my-app

# If deployment uses StatefulSet
kubectl delete pod -l app=my-app  # Pods restart with fresh mounts

# Check if PVC is bound and accessible
kubectl describe pvc my-pvc | grep -E "Status|Volume|Events"
kubectl get volumeattachments | grep my-pvc
```

Force detach and reattach a stuck CSI volume:

```bash
# Get the VolumeAttachment name
VA=$(kubectl get volumeattachments -o json | \
    python3 -c "
import json,sys
va = json.load(sys.stdin)
for item in va['items']:
    if 'my-pvc' in str(item):
        print(item['metadata']['name'])
" 2>/dev/null)

# Delete to force reattach
kubectl delete volumeattachment $VA
```

## Preventing Mount Failures with Timeouts

Configure appropriate timeouts to fail fast vs. retry indefinitely:

```bash
# For RBD (fast-fail for databases)
# Set osd_request_timeout in /etc/ceph/ceph.conf under [client]:
#     osd_request_timeout = 30
# Or specify when mapping:
rbd map <pool>/<image> -o osd_request_timeout=30

# For CephFS (retry longer for bulk storage)
mount -t ceph mon1:6789:/ /mnt/cephfs \
    -o name=admin,secretfile=/etc/ceph/admin.secret,\
       mount_timeout=30,recover_session=clean

# For /etc/fstab - add timeout and _netdev
echo "mon1:6789:/ /mnt/cephfs ceph name=admin,secretfile=/etc/ceph/admin.secret,\
mount_timeout=30,recover_session=clean,_netdev 0 0" >> /etc/fstab
```

## Summary

Network disconnections cause Ceph mounts to enter blocked I/O state while the client retries. Recovery is typically automatic once connectivity restores - kernel RBD and CephFS clients both reconnect and resume I/O. For Kubernetes CSI volumes, pod restarts often resolve persistent mount issues after extended disconnections. Configure `timeout` and `recover_session=clean` options to control whether applications see immediate I/O errors or retry until connectivity returns, matching the retry behavior to your application's fault tolerance requirements.
