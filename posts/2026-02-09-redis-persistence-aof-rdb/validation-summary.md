# Validation Summary: How to Implement Redis Persistence with AOF and RDB Snapshots on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis 7 persistence
- RDB snapshots
- AOF persistence
- Kubernetes StatefulSet, ConfigMap, CronJob, probes, PVCs
- kubectl
- AWS CLI / S3 backups
- Bash scripting

## Sources Consulted
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes probe documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- AWS CLI Docker image runtime check for available package manager and packages.

## Issues Found
- The Redis container readiness probes attempted to define `env` directly under `readinessProbe`. Kubernetes `Probe` objects do not support an `env` field. Moved `REDIS_PASSWORD` onto the Redis containers so the probe command can read it from the container environment.
- The AOF examples and backup scripts treated Redis 7 AOF as a single `/data/appendonly.aof` file. Redis 7 uses multi-part AOF files in an AOF directory controlled by `appenddirname`. Added `appenddirname "appendonlydir"` and changed backup/restore logic to copy `appendonlydir`.
- The backup procedure copied AOF files without disabling automatic AOF rewrites during the copy. Updated the script to temporarily set `auto-aof-rewrite-percentage` to `0`, restore the previous value on exit, and copy after the manual rewrite completes.
- The CronJob used `amazon/aws-cli:latest` but did not install `kubectl` or the local `tar` binary required by `kubectl cp`. Updated the command to install `tar`, `gzip`, and `kubectl`.
- The restore script scaled the StatefulSet down and then attempted `kubectl cp` into the deleted Redis pod. Updated it to mount the existing StatefulSet PVC in a temporary restore pod, copy the RDB and AOF directory into the PVC, delete the restore pod, and then scale Redis back up.

## Review Notes
- The examples still use floating `latest` tags for some operational images. Pinning image versions would make production deployments more reproducible.
- The manifests assume supporting resources already exist, including the `redis` namespace, secrets, service account, RBAC, storage class, backup PVC, and backup script ConfigMap.
