# Validation Summary: How to Configure MinIO Erasure Coding for Data Redundancy on Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes configuration guide

## Technologies Covered
- MinIO AIStor / MinIO Object Store
- MinIO erasure coding and storage-class parity settings
- MinIO Client (`mc`) admin commands
- Kubernetes StatefulSet and MinIO Operator Tenant resources
- Prometheus / Prometheus Operator alert rules

## Sources Consulted
- MinIO AIStor Erasure Coding: https://docs.min.io/aistor/operations/core-concepts/erasure-coding/
- MinIO AIStor Erasure Code Settings: https://docs.min.io/aistor/reference/aistor-server/settings/storage-class/
- MinIO AIStor Thresholds and Limits: https://docs.min.io/aistor/reference/aistor-server/thresholds/
- MinIO AIStor `mc admin info`: https://docs.min.io/community/minio-object-store/reference/minio-mc-admin/mc-admin-info.html
- MinIO AIStor `mc admin heal`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-heal/
- MinIO AIStor `mc admin object info`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-object-info/
- MinIO AIStor Heal Settings: https://docs.min.io/aistor/reference/aistor-server/settings/heal/
- MinIO AIStor Metrics v3 Reference: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/
- MinIO AIStor Expand Available Storage: https://docs.min.io/aistor/operations/scaling/expansion/
- Kubernetes StatefulSet API: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes StatefulSet Concepts: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Prometheus Operator API Reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- Corrected the parity model. The post implied MinIO automatically chooses half-parity layouts such as `EC:8` on 16 drives. Official MinIO docs state the default standard parity is `EC:4` for 8-16 drive erasure sets, while maximum parity is half the erasure set size. Updated the explanations, examples, capacity calculations, and StatefulSet comments.
- Clarified read versus write tolerance for maximum parity. `EC:8` on a 16-drive erasure set can read with 8 healthy drives, but writes require 9 healthy drives because write quorum is `K+1` when data and parity shards are equal.
- Added explicit `MINIO_STORAGE_CLASS_STANDARD: EC:4` to the StatefulSet example so the parity configuration matches the text and MinIO storage-class settings.
- Replaced stale `mc admin heal --scan deep` and `mc admin heal --dry-run` examples. Current `mc admin heal` syntax supports a bucket or prefix target with flags such as `--verbose` and `--all-drives`.
- Replaced outdated or incorrect Prometheus metric names with current Metrics v3 names, including `minio_cluster_health_drives_offline_count`, `minio_cluster_health_capacity_usable_total_bytes`, and `minio_heal_objects_errors_total`.
- Updated bitrot guidance. Scanner-based bitrot checks default to off in current MinIO heal settings; enabling them uses `mc admin config set myminio heal bitrotscan=on`, and per-object checks use `mc admin object info --bitrot`.
- Corrected the multiple-pool guidance. Bucket policies do not direct data to a specific MinIO pool; MinIO places new writes across pools based on available free space.

## Review Notes
The StatefulSet snippet is still a focused example and assumes supporting resources such as the `minio` namespace, a governing Service, and the `minio-creds` Secret already exist. For production Kubernetes deployments, the MinIO Operator Tenant resource is generally the preferred management path.
