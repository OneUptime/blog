# How to Set Up Ceph Cluster Configuration Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Backup, Configuration, Kubernetes

Description: Learn how to back up Ceph cluster configuration including Rook CRDs, CRUSH maps, and OSD maps to recover quickly from accidental misconfigurations.

---

## What to Back Up

Ceph cluster configuration includes several components that should be backed up regularly:

- Rook Kubernetes CRDs (CephCluster, CephBlockPool, CephFilesystem, etc.)
- Ceph CRUSH map
- Ceph OSD map (osdmap)
- Monitor map (monmap)
- RGW user and bucket configurations

## Export Rook CRDs from Kubernetes

Use kubectl to export all Rook CRDs to YAML files:

```bash
#!/bin/bash
BACKUP_DIR="/backup/rook-$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

for resource in cephcluster cephblockpool cephfilesystem cephobjectstore; do
  kubectl -n rook-ceph get "$resource" -o yaml > "$BACKUP_DIR/${resource}.yaml"
  echo "Backed up $resource"
done
```

Store these YAML files in a Git repository or object storage bucket.

## Export the CRUSH Map

The CRUSH map defines how data is distributed across failure domains. Back it up with:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd getcrushmap -o /tmp/crushmap.bin
  crushtool -d /tmp/crushmap.bin -o /tmp/crushmap.txt
  cat /tmp/crushmap.txt
"
```

Copy the binary and text versions off-cluster:

```bash
kubectl cp rook-ceph/rook-ceph-tools-<pod-id>:/tmp/crushmap.bin \
  ./backup/crushmap-$(date +%Y-%m-%d).bin
```

## Export OSD and Monitor Maps

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash -c "
  ceph osd dump > /tmp/osdmap.txt
  ceph mon dump > /tmp/monmap.txt
  cat /tmp/osdmap.txt
  cat /tmp/monmap.txt
"
```

## Automate with a CronJob

Create a Kubernetes CronJob that runs backup daily:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-config-backup
  namespace: rook-ceph
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rook-ceph-tools
          containers:
            - name: backup
              image: rook/ceph:v1.16.0
              command:
                - /bin/bash
                - -c
                - |
                  ceph osd getcrushmap -o /backup/crushmap.bin
                  ceph osd dump > /backup/osdmap.txt
                  ceph mon dump > /backup/monmap.txt
              volumeMounts:
                - name: backup-vol
                  mountPath: /backup
                - name: ceph-config
                  mountPath: /etc/ceph/ceph.conf
                  subPath: ceph.conf
                - name: mon-secret
                  mountPath: /etc/ceph/keyring
                  subPath: keyring
          volumes:
            - name: backup-vol
              persistentVolumeClaim:
                claimName: ceph-backup-pvc
            - name: ceph-config
              configMap:
                name: rook-ceph-config
            - name: mon-secret
              secret:
                secretName: rook-ceph-mon
                items:
                  - key: ceph-secret
                    path: keyring
          restartPolicy: OnFailure
```

## Verify Backup Integrity

After backing up the CRUSH map, verify it can be decoded without errors:

```bash
crushtool -d crushmap.bin -o crushmap-verify.txt
echo "Exit code: $?"
```

A zero exit code confirms the file is valid and restorable.

## Store Backups Off-Cluster

Push backups to an S3-compatible bucket outside the Ceph cluster itself to ensure they survive a cluster failure:

```bash
aws s3 cp ./backup/ s3://my-ceph-backups/$(date +%Y-%m-%d)/ --recursive \
  --endpoint-url https://external-s3.example.com
```

## Summary

Backing up Ceph cluster configuration involves exporting Rook CRDs, CRUSH maps, OSD maps, and monitor maps on a scheduled basis. Automating backups with a Kubernetes CronJob and storing them off-cluster in external object storage ensures you can restore the cluster configuration after accidental changes or disasters.
