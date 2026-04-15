# Validation Summary: How to Configure ClickHouse Persistent Volumes on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (server image tag 24.3)
- Kubernetes (PersistentVolume, PersistentVolumeClaim, StorageClass, StatefulSet)
- AWS EBS CSI Driver (ebs.csi.aws.com provisioner)
- kubectl CLI

## Sources Consulted
- Kubernetes PersistentVolume documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- AWS EBS CSI Driver documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver
- ClickHouse system.disks table documentation: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse Docker Hub image: https://hub.docker.com/r/clickhouse/clickhouse-server

## Issues Found
No technical issues found.

## Review Notes
- The PersistentVolume example uses `hostPath`, which is appropriate for demonstration but the post correctly frames it as being for clusters without dynamic provisioning. In production, cloud-backed volumes or networked storage would be preferred.
- The StatefulSet PVC naming convention (`data-clickhouse-0`) is correctly referenced and matches the Kubernetes pattern `{volumeClaimTemplate.name}-{statefulset.name}-{ordinal}`.
- The gp3 StorageClass parameters (`iops: "3000"`, `throughput: "125"`) match the AWS gp3 baseline defaults, which is a sensible starting point.
- The `system.disks` SQL query is correct and uses the proper column names and functions for ClickHouse.
- The post does not cover ClickHouse multi-disk or tiered storage configuration (storage policies with `storage.xml`), which could be a useful follow-up topic but is not an omission requiring correction.
