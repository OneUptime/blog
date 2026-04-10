# How to Configure Ceph for Kubernetes Jobs and CronJobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Job, CronJob, Batch, Storage

Description: Configure Rook-Ceph volumes for Kubernetes Jobs and CronJobs to enable reliable batch processing, backups, and scheduled data operations.

---

## Introduction

Kubernetes Jobs run batch tasks to completion, and CronJobs schedule recurring tasks. When these jobs need to read or write large datasets, Rook-Ceph provides reliable persistent storage. This guide covers patterns for using Ceph volumes with Job and CronJob workloads.

## Using Ceph Volumes in a Job

Jobs with PVCs work similarly to regular pods. The key consideration is that the volume must be available when the job starts:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: python:3.11-slim
        command:
        - python
        - /scripts/process.py
        volumeMounts:
        - name: input-data
          mountPath: /data/input
        - name: output-data
          mountPath: /data/output
      volumes:
      - name: input-data
        persistentVolumeClaim:
          claimName: input-pvc
          readOnly: true
      - name: output-data
        persistentVolumeClaim:
          claimName: output-pvc
```

## Using Object Storage in Jobs via Ceph RGW

For jobs that process files stored in object storage:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: s3-batch-job
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: batch
        image: amazon/aws-cli:latest
        command:
        - /bin/sh
        - -c
        - |
          aws s3 cp s3://input-bucket/dataset.csv /tmp/dataset.csv \
            --endpoint-url $RGW_ENDPOINT
          python /scripts/transform.py /tmp/dataset.csv /tmp/output.csv
          aws s3 cp /tmp/output.csv s3://output-bucket/result.csv \
            --endpoint-url $RGW_ENDPOINT
        env:
        - name: RGW_ENDPOINT
          value: "http://rook-ceph-rgw-store.rook-ceph:80"
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: rgw-creds
              key: access-key
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: rgw-creds
              key: secret-key
```

## Scheduled Backups with CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: ceph-data-backup
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: backup
            image: amazon/aws-cli:latest
            command:
            - /bin/sh
            - -c
            - |
              DATE=$(date +%Y-%m-%d)
              tar czf /tmp/backup-$DATE.tar.gz /data/
              aws s3 cp /tmp/backup-$DATE.tar.gz \
                s3://backups/daily/$DATE.tar.gz \
                --endpoint-url $RGW_ENDPOINT
            env:
            - name: RGW_ENDPOINT
              value: "http://rook-ceph-rgw-store.rook-ceph:80"
            - name: AWS_ACCESS_KEY_ID
              valueFrom:
                secretKeyRef:
                  name: rgw-creds
                  key: access-key
            - name: AWS_SECRET_ACCESS_KEY
              valueFrom:
                secretKeyRef:
                  name: rgw-creds
                  key: secret-key
            volumeMounts:
            - name: app-data
              mountPath: /data
              readOnly: true
          volumes:
          - name: app-data
            persistentVolumeClaim:
              claimName: app-data-pvc
              readOnly: true
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

## Handling Shared PVCs Across Job Runs

RBD PVCs are `ReadWriteOnce`, so concurrent job runs cannot share the same PVC. Use CephFS for jobs that might run in parallel:

```yaml
volumes:
- name: shared-data
  persistentVolumeClaim:
    claimName: shared-cephfs-pvc  # ReadWriteMany CephFS PVC
```

## Monitoring Job Storage Usage

```bash
# List PVCs used by completed jobs
kubectl get pvc | grep Bound

# Check remaining storage in Ceph
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph df
```

## Summary

Kubernetes Jobs and CronJobs integrate cleanly with Rook-Ceph storage for batch processing and scheduled backup workflows. Using RBD PVCs for single-run jobs and CephFS for concurrent access patterns ensures reliable data handling. CronJobs can automate recurring backup tasks by pushing data to Ceph RGW object storage on a schedule.
