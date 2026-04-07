# How to Verify Backup Integrity from Ceph Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Snapshot, Backup, Data Integrity

Description: Learn how to verify that Ceph snapshots and exported backups are complete and uncorrupted using checksum validation and test restoration procedures.

---

Taking snapshots is only half of a backup strategy. Verifying that those snapshots are complete and can be successfully restored is what makes a backup actually useful. Ceph provides tools to validate snapshot integrity at multiple levels.

## Creating a Snapshot for Testing

Create a pool snapshot as a baseline:

```bash
rados -p mypool mksnap mysnap
rados -p mypool lssnap
```

For RBD volumes (block storage):

```bash
rbd snap create mypool/myimage@mysnap
rbd snap ls mypool/myimage
```

For CephFS:

```bash
mkdir /mnt/cephfs/.snap/mysnap
ls /mnt/cephfs/.snap/
```

## Computing Checksums Before Backup

Before exporting, record checksums of critical objects:

```bash
#!/bin/bash
POOL="mypool"
SNAP="mysnap"
CHECKSUMS="/tmp/checksums-$(date +%Y%m%d).txt"

while IFS= read -r obj; do
  TMP_FILE="$(mktemp)"
  rados -p "$POOL" -s "$SNAP" get "$obj" "$TMP_FILE"
  echo "$(md5sum "$TMP_FILE" | awk '{print $1}') $obj" >> "$CHECKSUMS"
  rm -f "$TMP_FILE"
done < <(rados -p "$POOL" ls)
echo "Checksums written to $CHECKSUMS"
```

## Exporting an RBD Snapshot

Export a snapshot to a file:

```bash
rbd export mypool/myimage@mysnap /backup/myimage-snap.img
```

Compute checksum of the export:

```bash
sha256sum /backup/myimage-snap.img > /backup/myimage-snap.img.sha256
```

## Verifying the Export Integrity

After the export completes:

```bash
sha256sum -c /backup/myimage-snap.img.sha256
```

Expected output:

```text
/backup/myimage-snap.img: OK
```

## Test Restoration to Verify Completeness

Import the exported image to a test pool:

```bash
rbd import /backup/myimage-snap.img testpool/restored-image

# Map the restored image
rbd device map testpool/restored-image

# Verify the filesystem before mounting it
fsck -n /dev/rbd0

# Mount and verify filesystem contents
mount /dev/rbd0 /mnt/test-restore
ls -la /mnt/test-restore
```

## Verifying CephFS Snapshot Consistency

Access the snapshot through the `.snap` directory and diff it against the live directory:

```bash
diff -r /mnt/cephfs/data/.snap/mysnap /mnt/cephfs/data
```

Or use rsync in dry-run mode:

```bash
rsync -anv /mnt/cephfs/data/.snap/mysnap/ /mnt/verify/
```

## Automated Verification CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: verify-ceph-backup
  namespace: rook-ceph
spec:
  schedule: "0 4 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: verify
            image: ceph/ceph:latest
            command:
            - /bin/bash
            - -c
            - |
              rbd export testpool/myimage@mysnap /tmp/verify.img
              sha256sum /tmp/verify.img
          restartPolicy: OnFailure
```

## Summary

Verifying backup integrity from Ceph snapshots requires checksumming objects before and after export, performing test restorations, and running filesystem checks on restored volumes. Automating this process via Kubernetes CronJobs ensures ongoing confidence that your backups are usable, not just present.
