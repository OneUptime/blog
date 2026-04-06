# How to Schedule Scrubbing During Off-Peak Hours

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Scrubbing, Scheduling, Performance, Kubernetes

Description: Learn how to schedule Ceph scrubbing operations to run during off-peak hours, minimizing I/O impact on production workloads while ensuring regular data integrity checks.

---

## Why Schedule Scrubs During Off-Peak Hours

Ceph scrubbing - both shallow and deep - consumes significant I/O and CPU resources on OSDs. Running scrubs during business hours can degrade application performance, increase latency, and compete with production I/O. Scheduling scrubs for nights and weekends ensures data integrity verification happens without impacting end users.

## Configuring Scrub Time Windows

Ceph supports time-based scrub windows using hour-of-day restrictions:

```bash
# Allow scrubs only between 11 PM and 7 AM (hours in 24-hour format)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_begin_hour 23

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_end_hour 7

# Verify the settings
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd osd_scrub_begin_hour

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config get osd osd_scrub_end_hour
```

Note: When `begin_hour` > `end_hour`, the window wraps midnight (e.g., 23 to 7 = 11 PM to 7 AM).

## Configuring Day-of-Week Restrictions

Ceph also supports restricting scrubs to specific days of the week:

```bash
# Allow scrubs only on weekends (0=Sunday, 6=Saturday)
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_begin_week_day 0

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_end_week_day 2
```

## Combining Time Window with Interval Settings

Ensure scrubs complete within the maximum interval even with restricted windows:

```bash
# With a 9-hour nightly window, ensure max interval allows completion
# 7-day max interval with nightly windows = 63 hours of scrub time available
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_min_interval 86400     # 1 day minimum

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_scrub_max_interval 604800    # 7 day maximum
```

## Manually Pausing Scrubs During Peak Hours

For temporary pause during planned high-load events:

```bash
# Disable all scrubbing immediately
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set noscrub

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd set nodeep-scrub

# Re-enable after the event
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd unset noscrub

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd unset nodeep-scrub
```

## Automating Scrub Pausing with CronJobs

Use a Kubernetes CronJob to pause and resume scrubbing automatically:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: pause-scrubbing-peak
  namespace: rook-ceph
spec:
  schedule: "0 8 * * 1-5"   # 8 AM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: rook-ceph-operator
          containers:
          - name: ceph-pause-scrub
            image: rook/ceph:latest
            command:
            - ceph
            - osd
            - set
            - noscrub
          restartPolicy: OnFailure
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: resume-scrubbing-offpeak
  namespace: rook-ceph
spec:
  schedule: "0 22 * * 1-5"  # 10 PM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: ceph-resume-scrub
            image: rook/ceph:latest
            command:
            - ceph
            - osd
            - unset
            - noscrub
          restartPolicy: OnFailure
```

## Summary

Scheduling Ceph scrubs during off-peak hours combines native time-window configuration (`osd_scrub_begin_hour` and `osd_scrub_end_hour`) with optional day-of-week restrictions. Ensure the off-peak window is large enough to complete scrubs within the maximum interval to avoid overdue-scrub health warnings. For temporary pausing during planned load events, use the `noscrub` and `nodeep-scrub` OSD flags, and automate the pause/resume cycle with Kubernetes CronJobs.
