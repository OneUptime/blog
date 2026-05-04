# Validation Summary: How to Configure Longhorn for High IOPS Workloads

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn (Kubernetes block storage)
- Kubernetes (StorageClass, StatefulSet, Pod)
- NVMe / SSD storage tuning
- PostgreSQL configuration
- XFS filesystem
- fio benchmarking tool
- `lsblk` Linux utility

## Sources Consulted
- Longhorn StorageClass parameters reference: https://longhorn.io/docs/1.7.0/references/storage-class-parameters/
- Longhorn settings reference: https://longhorn.io/docs/1.7.0/references/settings/
- Longhorn node and disk tags: https://longhorn.io/docs/1.7.0/nodes-and-volumes/nodes/node-tag/
- Longhorn data locality: https://longhorn.io/docs/1.7.0/high-availability/data-locality/
- PostgreSQL runtime configuration: https://www.postgresql.org/docs/15/runtime-config-resource.html and https://www.postgresql.org/docs/15/runtime-config-wal.html
- Kubernetes StorageClass mountOptions: https://kubernetes.io/docs/concepts/storage/storage-classes/#mount-options
- fio documentation: https://fio.readthedocs.io/en/latest/fio_doc.html

## Issues Found

1. **Invalid `nodeSelector` value in StorageClass** — The `longhorn-nvme` StorageClass had `nodeSelector: "storage-type=nvme"`. Longhorn's `nodeSelector` parameter takes a comma-separated list of Longhorn node tags (e.g. `"nvme"`), not Kubernetes-style `key=value` selectors. As written it would either match nothing or block scheduling. Since the post never instructs the reader to add a Longhorn node tag (only Kubernetes labels and Longhorn disk tags are set up), I removed the `nodeSelector` parameter — `diskSelector: "nvme"` already restricts replica placement to NVMe disks. The Kubernetes `nodeSelector` on the PostgreSQL StatefulSet (which uses K8s labels) is unaffected and remains correct.

2. **Contradictory `auto-cleanup-system-generated-snapshot` setting** — The comment said "Disable automatic snapshot cleanup during I/O to prevent latency spikes" but the patch set the value to `"true"`, which *enables* cleanup (and is also the default, so the patch was a no-op). Changed value to `"false"` so it matches the stated intent of disabling cleanup, and clarified the comment to note the default.

3. **Incorrect description of `replica-replenishment-wait-interval`** — Comment said "Reduce replica sync timeout for faster failure detection". Per the Longhorn docs, this setting controls how long Longhorn waits before creating a brand-new replica for a degraded volume (giving the original replica time to come back). It is unrelated to failure detection. Rewrote the comment accordingly.

4. **Misleading PostgreSQL `effective_cache_size` comment** — Comment said "Use sequential scan for large tables". `effective_cache_size` is a planner hint about total memory available for caching across the OS and PostgreSQL; higher values typically *favor index scans*, not sequential scans. Replaced the comment with an accurate description. While there, also tightened the `checkpoint_completion_target` comment ("Tune checkpoints for fewer write amplifications" → "Spread checkpoint writes to reduce I/O bursts") since the parameter spreads checkpoint I/O over time rather than reducing write amplification.

## Review Notes

- `staleReplicaTimeout: "30"` is in **minutes** (not seconds). 30 minutes is also the Longhorn default, so this line is essentially decorative; left as-is since it's not incorrect.
- `dataLocality: "strict-local"` requires `numberOfReplicas: "1"`, which the post correctly does. Worth noting volume creation will fail if these are mismatched.
- `concurrent-replica-rebuild-per-node-limit` default is `5`; the post sets it to `3`. Both are valid; the lower value reduces rebuild impact on production I/O at the cost of slower recovery.
- The `lsblk -d -o NAME,TYPE,ROTA,SIZE` command and the `ROTA=0` interpretation (non-rotational, i.e. SSD/NVMe) are correct.
- `provisioner: driver.longhorn.io` is the correct CSI driver name for Longhorn.
- `mountOptions` is a top-level Kubernetes `StorageClass` field (not under `parameters`), and the post places it correctly.
- The `fio` benchmark pod references a `benchmark-pvc` PersistentVolumeClaim that the reader must create separately; this is implicit but not called out.
- Longhorn versioning is not specified in the post. The settings and parameters used are valid for Longhorn 1.4+ at minimum; readers on older versions (e.g. pre-1.4 lacking `strict-local`) would need to upgrade.
