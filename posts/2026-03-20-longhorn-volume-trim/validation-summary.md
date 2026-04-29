# Validation Summary: How to Configure Longhorn Volume Trim - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn
- Kubernetes
- `kubectl`
- Longhorn `RecurringJob`
- Kubernetes `StorageClass`
- Prometheus metrics
- Linux filesystem trim (`fstrim`)

## Sources Consulted
- Longhorn Trim Filesystem documentation: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/trim-filesystem/
- Longhorn Recurring Snapshots and Backups documentation: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn Storage Class Parameters documentation: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn Volume Size documentation: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/volume-size/
- Longhorn Metrics for Monitoring documentation: https://longhorn.io/docs/latest/monitoring/metrics/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/

## Issues Found
- The post said the volume must be mounted with the `discard` option and included pod/initContainer examples that did not match Longhorn's documented trim workflow. Updated this to the actual prerequisites from Longhorn documentation: Longhorn `v1.4.0+`, a trimmable filesystem such as `ext4` or `xfs`, and an attached, mounted volume.
- The periodic trim example used a cron job inside an `initContainer`, which would not work because init containers exit before the main workload starts. Replaced this with the documented Longhorn `RecurringJob` approach using task `filesystem-trim`.
- The post described trimming via a direct Longhorn API `curl` call and `kubectl get lhvolume`, which were not supported by the official documentation consulted for this review. Replaced that section with the documented shell-based `fstrim` workflow for both RWO and RWX volumes.
- The StorageClass section incorrectly implied that `unmapMarkSnapChainRemoved` enables automatic trim or the `discard` mount option. Corrected it to show `recurringJobSelector` for automatic trim assignment and clarified that `unmapMarkSnapChainRemoved` only changes snapshot handling during trim.
- The monitoring section used an unsupported `longhorn-manager --volume-name <name> space-info` command. Replaced it with a documented `volumes.longhorn.io` `actualSize` check and the official Prometheus metric `longhorn_volume_actual_size_bytes`.
- The explanation of trim behavior was oversimplified and implied all freed blocks are reclaimed uniformly. Updated it to reflect Longhorn's documented limitation that valid snapshots remain immutable, so trim primarily reclaims space from the volume head and continuous chains of removed or system snapshots.

## Review Notes
- By default, Longhorn recurring jobs run only while a volume is attached. Detached-volume execution requires the Longhorn setting `allow-recurring-job-while-volume-detached`.
- Kubernetes `StorageClass` supports `mountOptions`, but Longhorn documentation explicitly warns to use `discard` with caution when automatic snapshot removal during trim is enabled because it can interrupt operations such as backup creation.
