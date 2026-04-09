# How to Migrate OSDs from FileStore to BlueStore

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, BlueStore, Migration

Description: Step-by-step guide to migrating Ceph OSDs from the legacy FileStore backend to the modern BlueStore backend using Rook.

---

## Why Migrate from FileStore to BlueStore

FileStore was the original Ceph OSD backend, storing objects as files on an XFS filesystem. BlueStore, introduced in Ceph Luminous, stores data directly on raw block devices without an intermediate filesystem. BlueStore delivers significant write performance improvements (20-30%+ depending on workload), built-in checksumming, inline compression, and lower CPU overhead. All Ceph clusters running Nautilus or later should use BlueStore exclusively. If you have legacy FileStore OSDs, migrating them is essential for performance and supportability.

## Pre-Migration Checks

First, identify which OSDs are still using FileStore:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata | python3 -c \
  "import sys,json; [print(o['id'], o['osd_objectstore']) for o in json.load(sys.stdin)]"
```

Confirm that your cluster has sufficient redundancy to survive OSD removal:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

The cluster should be `HEALTH_OK` before beginning migration.

## Migration Process

FileStore to BlueStore migration requires destroying and recreating each OSD. The data is preserved because Ceph replicates to surviving OSDs before the target OSD is removed.

### Step 1 - Mark OSD Out

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd out osd.<id>
```

Wait for the cluster to recover fully before proceeding:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph -w
```

### Step 2 - Remove the OSD via Rook

Delete the OSD deployment and clean the disk using the Rook OSD removal job:

```bash
kubectl -n rook-ceph delete deploy rook-ceph-osd-<id>
```

Label the disk for cleanup:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd purge <id> --yes-i-really-mean-it
```

### Step 3 - Wipe the Disk

Create a disk wipe job on the node:

```bash
kubectl apply -f - <<'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: disk-wipe
  namespace: rook-ceph
spec:
  template:
    spec:
      restartPolicy: Never
      nodeName: <node-name>
      containers:
      - name: wipe
        image: rook/ceph:master
        command: ["sh", "-c", "wipefs -a /dev/sdX && sgdisk --zap-all /dev/sdX && dd if=/dev/zero of=/dev/sdX bs=1M count=100"]
        securityContext:
          privileged: true
        volumeMounts:
        - name: dev
          mountPath: /dev
      volumes:
      - name: dev
        hostPath:
          path: /dev
EOF
```

### Step 4 - Let Rook Provision a New BlueStore OSD

Once the disk is clean, the Rook operator will detect it and provision a new BlueStore OSD automatically. Monitor the operator logs:

```bash
kubectl -n rook-ceph logs deploy/rook-ceph-operator -f | grep -i osd
```

## Verifying BlueStore

Confirm the new OSD uses BlueStore:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd metadata osd.<new-id> | grep objectstore
```

## Summary

Migrating from FileStore to BlueStore requires removing each OSD one at a time, wiping its disk, and allowing Rook to reprovision it as BlueStore. The process leverages Ceph's replication to maintain data availability throughout. Always verify cluster health after each OSD migration before proceeding to the next.
