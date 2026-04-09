# How to Fix Boot-Time CephFS Mount Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Kubernetes, Troubleshooting

Description: Learn how to diagnose and fix CephFS mount failures that occur at node boot time in Rook-Ceph Kubernetes environments.

---

## Why CephFS Mounts Fail at Boot

Boot-time CephFS mount failures are a common pain point in Rook-Ceph deployments. When a Kubernetes node reboots, the CSI driver and Ceph monitors may not be fully ready before the kubelet attempts to remount volumes. This race condition causes pods to remain in a `ContainerCreating` state with mount errors in the logs.

The most common root causes include:

- Ceph monitors not ready before the CSI node plugin starts
- The `rook-ceph-operator` pod not running when mounts are attempted
- Stale mount entries left by a hard reboot
- Kernel module `ceph` not loaded at boot

## Step 1 - Check Node and Pod Status

After a node comes back online, check which pods are stuck:

```bash
kubectl get pods -A | grep -v Running | grep -v Completed
kubectl describe pod <stuck-pod> -n <namespace>
```

Look for events like `MountVolume.MountDevice failed` or `failed to mount volume`.

## Step 2 - Inspect the CSI Node Plugin Logs

The CephFS CSI node plugin handles mounts on each node. Check its logs for the specific node:

```bash
kubectl get pods -n rook-ceph -l app=csi-cephfsplugin -o wide
kubectl logs -n rook-ceph <csi-cephfsplugin-pod> -c csi-cephfsplugin --previous
```

Common errors include connection refused to `ceph-mon` or GRPC timeout when talking to the CSI identity server.

## Step 3 - Verify Kernel Module Is Loaded

CephFS kernel mounts require the `ceph` kernel module. Confirm it is loaded on the affected node:

```bash
lsmod | grep ceph
modprobe ceph
```

To make the module load at boot, add it to the modules load configuration:

```bash
echo "ceph" | sudo tee /etc/modules-load.d/ceph.conf
```

## Step 4 - Check for Stale Mount Entries

After a hard reboot, stale entries may exist in `/proc/mounts`. Clean them:

```bash
cat /proc/mounts | grep ceph
umount -l /var/lib/kubelet/plugins/kubernetes.io/csi/pv/<pv-name>/globalmount
```

## Step 5 - Adjust CSI Driver Startup Ordering

Tuning the health check intervals helps the Rook operator detect and recover unhealthy Ceph daemons faster after a reboot, reducing the window where mount failures can occur. Edit the `CephCluster` resource to adjust the health check intervals:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:v18.2.0
  mon:
    count: 3
    allowMultiplePerNode: false
  healthCheck:
    daemonHealth:
      mon:
        interval: 45s
      osd:
        interval: 60s
```

## Step 6 - Use Init Containers to Wait for Ceph Readiness

Prevent application containers from starting until the Ceph cluster is reachable by using an init container:

```yaml
apiVersion: v1
kind: Pod
spec:
  initContainers:
  - name: wait-for-ceph
    image: busybox
    command: ["sh", "-c", "until nslookup rook-ceph-mon-a.rook-ceph.svc.cluster.local > /dev/null 2>&1; do sleep 2; done"]
  containers:
  - name: app
    image: myapp:latest
```

Replace `rook-ceph-mon-a` with the name of one of your Ceph monitor services.

## Step 7 - Restart Stuck Pods

Once the cluster is healthy, force restart pods that failed to mount:

```bash
kubectl rollout restart deployment/<deployment-name> -n <namespace>
```

If pods remain stuck, delete them to trigger rescheduling:

```bash
kubectl delete pod <stuck-pod> -n <namespace>
```

## Summary

Boot-time CephFS mount failures in Rook-Ceph typically stem from a race between node startup and CSI driver readiness. The fix involves loading the `ceph` kernel module at boot, clearing stale mount entries, and ensuring the operator and monitors are healthy before application pods attempt to attach volumes. Using init containers or readiness gates adds resilience to reboot scenarios.
