# How to Use Ceph RGW as S3 Backend for Victoria Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Victoria Metrics, Kubernetes, Storage, Monitoring, S3

Description: Use Ceph RGW S3-compatible storage as the backend for VictoriaMetrics cluster on Kubernetes to store snapshots and backups on-premises.

---

## Overview

VictoriaMetrics is a fast, cost-efficient time-series database. Its enterprise and cluster editions support S3-compatible object storage for backups and off-site snapshots. Ceph RGW provides an on-premises S3 endpoint that integrates seamlessly with VictoriaMetrics backup tools.

## Prepare Ceph RGW

Create the object store and user:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: vm-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
```

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=victoriametrics \
  --display-name="VictoriaMetrics" \
  --access-key=vmaccesskey \
  --secret-key=vmsecretkey

aws s3 mb s3://vm-backups \
  --endpoint-url http://rook-ceph-rgw-vm-store.rook-ceph:80
```

## Deploy VictoriaMetrics Cluster

Install using Helm with storage config:

```bash
helm repo add vm https://victoriametrics.github.io/helm-charts
helm install victoria-metrics vm/victoria-metrics-cluster \
  --namespace monitoring \
  --create-namespace \
  --set vmstorage.vmbackupmanager.enabled=true \
  --set vmstorage.vmbackupmanager.destination="s3://vm-backups" \
  --set vmstorage.vmbackupmanager.extraArgs.customS3Endpoint=http://rook-ceph-rgw-vm-store.rook-ceph:80 \
  --set vmstorage.vmbackupmanager.env[0].name=AWS_ACCESS_KEY_ID \
  --set vmstorage.vmbackupmanager.env[0].value=vmaccesskey \
  --set vmstorage.vmbackupmanager.env[1].name=AWS_SECRET_ACCESS_KEY \
  --set vmstorage.vmbackupmanager.env[1].value=vmsecretkey
```

## Configure vmbackup

Create a backup using `vmbackup`:

```bash
vmbackup \
  -storageDataPath=/var/lib/victoriametrics \
  -dst=s3://vm-backups/daily/$(date +%Y-%m-%d) \
  -customS3Endpoint=http://rook-ceph-rgw-vm-store.rook-ceph:80 \
  -credsFilePath=/etc/vm/creds.env
```

The credentials file:

```bash
AWS_ACCESS_KEY_ID=vmaccesskey
AWS_SECRET_ACCESS_KEY=vmsecretkey
```

## Restore from Backup

Use `vmrestore` to restore data:

```bash
vmrestore \
  -src=s3://vm-backups/daily/2026-03-30 \
  -storageDataPath=/var/lib/victoriametrics \
  -customS3Endpoint=http://rook-ceph-rgw-vm-store.rook-ceph:80 \
  -credsFilePath=/etc/vm/creds.env
```

## Automate Backups with CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vm-backup
  namespace: monitoring
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: vmbackup
              image: victoriametrics/vmbackup:latest
              command: ["/bin/sh", "-c"]
              args:
                - |
                  /vmbackup-prod \
                    -storageDataPath=/vmdata \
                    -dst=s3://vm-backups/daily/$(date +%Y-%m-%d) \
                    -customS3Endpoint=http://rook-ceph-rgw-vm-store.rook-ceph:80
              env:
                - name: AWS_ACCESS_KEY_ID
                  value: "vmaccesskey"
                - name: AWS_SECRET_ACCESS_KEY
                  value: "vmsecretkey"
          restartPolicy: OnFailure
```

## Summary

Ceph RGW gives VictoriaMetrics an on-premises S3-compatible backend for backups and snapshots, removing the need for cloud storage. Combined with Rook's declarative Ceph management, you get a fully self-contained metrics storage and backup pipeline on Kubernetes.
