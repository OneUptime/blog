# How to Fix MON Pods Restarting Due to Missing dataDirHostPath

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Storage, Troubleshooting

Description: Diagnose and fix Rook Ceph MON pods that restart because the dataDirHostPath directory is missing or inaccessible on the host node.

---

## Understanding dataDirHostPath

`dataDirHostPath` is a field in the `CephCluster` spec that specifies a directory on the host filesystem where Rook stores Ceph daemon data. For monitors not using PVC-backed storage, this path holds the monitor's Paxos database and keyring. If this path is missing, has wrong permissions, or points to a filesystem that was unmounted, MON pods will fail to start with errors about missing directories.

## Identifying the Problem

Check MON pod status and logs:

```bash
kubectl -n rook-ceph get pods -l app=rook-ceph-mon
kubectl -n rook-ceph describe pod rook-ceph-mon-a-<suffix>
kubectl -n rook-ceph logs rook-ceph-mon-a-<suffix> --previous
```

Look for errors like:

```text
error: unable to write to directory /var/lib/rook/mon-a/data
failed to create directory /var/lib/rook
permission denied: /var/lib/rook/mon-a
```

## Checking the Current dataDirHostPath

View the configured path:

```bash
kubectl -n rook-ceph get cephcluster rook-ceph -o jsonpath='{.spec.dataDirHostPath}'
```

Verify the directory exists on the node where the MON pod is scheduled:

```bash
NODE=$(kubectl -n rook-ceph get pod rook-ceph-mon-a-<suffix> -o jsonpath='{.spec.nodeName}')
echo "MON is on node: $NODE"
kubectl debug node/$NODE --image=busybox -- ls -la /host/var/lib/rook/
```

## Creating the Missing Directory

If the directory is missing, create it on the affected node:

```bash
kubectl debug node/$NODE -it --image=ubuntu -- bash
# Inside the debug pod
mkdir -p /host/var/lib/rook
chmod 755 /host/var/lib/rook
chown root:root /host/var/lib/rook
```

## Using a DaemonSet to Pre-Create the Directory

For nodes where the directory may not persist across reboots, use a DaemonSet:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: rook-dir-setup
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      name: rook-dir-setup
  template:
    metadata:
      labels:
        name: rook-dir-setup
    spec:
      initContainers:
      - name: create-dir
        image: busybox
        command: ["sh", "-c", "mkdir -p /host/var/lib/rook && chmod 755 /host/var/lib/rook"]
        volumeMounts:
        - name: host
          mountPath: /host
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.10
      volumes:
      - name: host
        hostPath:
          path: /
```

## Migrating to PVC-Backed Monitors

To avoid this problem entirely, migrate to PVC-backed monitors which use Kubernetes persistent volumes instead of host paths:

```yaml
spec:
  mon:
    count: 3
    volumeClaimTemplate:
      spec:
        storageClassName: standard
        resources:
          requests:
            storage: 10Gi
```

## Recovering Monitor Data

If the host path existed previously but was wiped (node reprovisioned), the monitor data is lost. In this case, remove the affected monitor and let Rook create a new one:

```bash
kubectl -n rook-ceph delete deploy rook-ceph-mon-a
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph mon remove a
```

## Summary

MON pod restarts due to missing `dataDirHostPath` are caused by the host directory being absent, having wrong permissions, or being wiped during node maintenance. Create the directory manually on affected nodes, use a DaemonSet for automation, or migrate to PVC-backed monitors for a Kubernetes-native solution that eliminates host path dependencies.
