# How to Scrub the CephFS Filesystem

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Scrubbing, Maintenance

Description: Learn how to run CephFS metadata and data scrubs in Rook-Ceph to detect and repair filesystem inconsistencies proactively.

---

## Why Scrub CephFS

CephFS scrubbing inspects filesystem metadata for inconsistencies such as orphaned inodes, corrupted directory entries, and mismatched checksums. Running scrubs regularly is a best practice for maintaining filesystem health, especially after unclean shutdowns or hardware failures.

Ceph offers two types of scrubs for CephFS:

- **Metadata scrub** - Verifies inode and directory tree integrity via the MDS
- **Data scrub** - Checks RADOS object checksums for data pool objects (part of standard OSD scrubbing)

## Step 1 - Check Current Filesystem Health

Before scrubbing, verify the cluster and filesystem are in a healthy state:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph status
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- ceph fs status
```

Only proceed with a scrub when `HEALTH_OK` or `HEALTH_WARN` (non-critical warnings) is reported.

## Step 2 - Start a Metadata Scrub

Initiate a CephFS metadata scrub using the `scrub start` command on the MDS:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 scrub start / recursive
```

To scrub a specific path:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 scrub start /volumes/mysubvolume recursive
```

## Step 3 - Check Scrub Status

Monitor the progress of a running scrub:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 scrub status
```

Sample output:

```text
{
  "scrub_status": "scrubbing",
  "tag": "a1b2c3d4",
  "starting_from": "/",
  "progress": "47.3%"
}
```

## Step 4 - Abort a Running Scrub

Scrubs can be aborted if they are impacting performance:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 scrub abort
```

## Step 5 - Repair During Scrub

To automatically repair any inconsistencies found during the scrub, add the `repair` flag:

```bash
kubectl exec -it deploy/rook-ceph-tools -n rook-ceph -- \
  ceph tell mds.myfs:0 scrub start / recursive repair
```

Use with caution - `repair` can make destructive changes to metadata to resolve inconsistencies.

## Step 6 - Schedule Regular Scrubs via CronJob

Automate scrubs in Kubernetes using a CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cephfs-scrub
  namespace: rook-ceph
spec:
  schedule: "0 2 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scrub
            image: rook/ceph:v1.14.0
            command:
            - ceph
            - tell
            - mds.myfs:0
            - scrub
            - start
            - /
            - recursive
            volumeMounts:
            - name: ceph-config
              mountPath: /etc/ceph
              readOnly: true
          volumes:
          - name: ceph-config
            projected:
              sources:
              - configMap:
                  name: rook-ceph-mon-endpoints
              - secret:
                  name: rook-ceph-mon
          restartPolicy: OnFailure
```

## Step 7 - Review Scrub Results

After the scrub completes, check the MDS log for any reported errors:

```bash
kubectl logs -n rook-ceph deploy/rook-ceph-mds-myfs-a | grep -E "scrub|inconsistency|error"
```

## Summary

Regular CephFS metadata scrubs in Rook-Ceph ensure filesystem consistency by detecting orphaned inodes and corrupted directory entries. Use `ceph tell mds scrub start` with the `recursive` flag for full tree scrubs, and automate them via Kubernetes CronJobs. The `repair` option enables automatic repair but should be used carefully. Always verify cluster health before initiating a scrub.
