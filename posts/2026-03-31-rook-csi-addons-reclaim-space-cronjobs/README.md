# How to Schedule Reclaim Space CronJobs with Rook CSI-Addons

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CSI, CronJob, Kubernetes

Description: Learn how to create ReclaimSpaceCronJob resources with Rook CSI-Addons to automatically and periodically reclaim unused space in Ceph volumes.

---

## Why Schedule Recurring Space Reclaim

A `ReclaimSpaceJob` is a one-time operation. For production systems where applications continuously create and delete data, you need recurring space reclamation to keep the Ceph pool from growing unnecessarily. `ReclaimSpaceCronJob` is the CSI-Addons resource that schedules reclaim operations on a Cron schedule, automating the maintenance task without manual intervention.

## Creating a ReclaimSpaceCronJob

Create a `ReclaimSpaceCronJob` that targets a PVC and runs weekly:

```yaml
apiVersion: csiaddons.openshift.io/v1alpha1
kind: ReclaimSpaceCronJob
metadata:
  name: reclaim-weekly
  namespace: my-app
spec:
  schedule: "0 2 * * 0"
  jobTemplate:
    spec:
      target:
        persistentVolumeClaim: my-rbd-pvc
      backOffLimit: 6
      retryDeadlineSeconds: 1800
  failedJobsHistoryLimit: 3
  successfulJobsHistoryLimit: 3
  concurrencyPolicy: Forbid
```

- `schedule` - standard Cron syntax (this runs every Sunday at 02:00)
- `failedJobsHistoryLimit` - how many failed job records to keep
- `successfulJobsHistoryLimit` - how many successful job records to keep
- `concurrencyPolicy: Forbid` - skip the next run if the current one is still running

## Applying and Verifying

Apply the CronJob:

```bash
kubectl apply -f reclaim-cronjob.yaml
```

Check its status:

```bash
kubectl get reclaimspacecronjob reclaim-weekly -n my-app
```

Output:

```text
NAME              SCHEDULE      SUSPEND   ACTIVE   LAST SCHEDULE   AGE
reclaim-weekly    0 2 * * 0     False     0        <none>          5m
```

After the first scheduled run:

```bash
kubectl get reclaimspacejob -n my-app
```

The CronJob creates a `ReclaimSpaceJob` with a generated name at each scheduled interval.

## Suspending and Resuming

Temporarily suspend a CronJob without deleting it:

```bash
kubectl patch reclaimspacecronjob reclaim-weekly -n my-app \
  -p '{"spec":{"suspend":true}}' --type=merge
```

Resume it:

```bash
kubectl patch reclaimspacecronjob reclaim-weekly -n my-app \
  -p '{"spec":{"suspend":false}}' --type=merge
```

## Applying to Multiple PVCs

Create one CronJob per PVC, or loop over all PVCs in a namespace:

```bash
for pvc in $(kubectl get pvc -n my-app -o jsonpath='{.items[*].metadata.name}'); do
  kubectl apply -n my-app -f - <<EOF
apiVersion: csiaddons.openshift.io/v1alpha1
kind: ReclaimSpaceCronJob
metadata:
  name: reclaim-${pvc}
  namespace: my-app
spec:
  schedule: "0 3 * * 0"
  jobTemplate:
    spec:
      target:
        persistentVolumeClaim: ${pvc}
      backOffLimit: 3
      retryDeadlineSeconds: 1800
  successfulJobsHistoryLimit: 2
  failedJobsHistoryLimit: 2
EOF
done
```

## Monitoring CronJob History

View the history of completed reclaim jobs:

```bash
kubectl get reclaimspacejob -n my-app \
  --sort-by='.metadata.creationTimestamp'
```

For detailed results of a specific job run:

```bash
kubectl describe reclaimspacejob <job-name> -n my-app
```

## Summary

`ReclaimSpaceCronJob` automates the periodic space reclamation process for Ceph-backed volumes in Rook. Schedule jobs using standard Cron syntax, set retention limits for job history, and use `concurrencyPolicy: Forbid` to prevent overlapping runs. This ensures that Ceph pool usage accurately reflects active data without requiring manual maintenance windows for space cleanup.
