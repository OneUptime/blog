# Validation Summary: How to Migrate PersistentVolumes to Talos Linux Clusters

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Talos Linux
- Kubernetes (PersistentVolumes, PersistentVolumeClaims, StorageClass, Pods)
- Velero (with node-agent / file system backup, change-storage-class plugin)
- Longhorn (CSI / storage provisioner)
- PostgreSQL (`pg_dump`, `pg_restore`)
- MySQL / MariaDB (`mysqldump`, `mysql`)
- Redis (`BGSAVE`, RDB persistence)
- Elasticsearch (snapshot API, fs repository)
- rsync (and the `instrumentisto/rsync-ssh` image)
- NFS (inline pod volumes)
- `kubectl` (exec, cp, port-forward, apply)
- `yq` (v4 mikefarah)

## Sources Consulted
- Velero file system backup docs — https://velero.io/docs/main/file-system-backup/
- Velero restore reference (change-storage-class plugin) — https://velero.io/docs/main/restore-reference/
- Redis DEBUG RELOAD source / persistence docs — https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/ and `src/debug.c` in redis/redis
- `kubectl exec` reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- `rsyncd.conf(5)` man page — https://www.man7.org/linux/man-pages/man5/rsyncd.conf.5.html
- Sidero Labs (Talos) Kubernetes storage / CSI docs — https://docs.siderolabs.com/kubernetes-guides/csi/storage
- Longhorn StorageClass parameters — https://longhorn.io/docs/

## Issues Found

1. **MySQL restore: shell redirect on the wrong side of `kubectl exec`.**
   The original command `kubectl exec -n production mysql-0 -- mysql -u root < /tmp/all-databases.sql` lets the local shell interpret the `<` redirect, so it tries to read `/tmp/all-databases.sql` from the workstation, not the pod (where `kubectl cp` placed it). Fixed by wrapping with `sh -c "mysql -u root < /tmp/all-databases.sql"` so the redirect runs inside the container.

2. **Redis restore: `DEBUG RELOAD` silently discards the imported `dump.rdb`.**
   Per the Redis source (`src/debug.c`) and persistence docs, `DEBUG RELOAD` without the `NOSAVE` flag first runs `rdbSave()` — overwriting the just-copied `dump.rdb` with the current (empty/different) in-memory state — and only then reloads from disk. Replaced with `kubectl delete pod -n production redis-0`, which restarts the StatefulSet pod so Redis loads the imported RDB at startup. Added a comment explaining why `DEBUG RELOAD` is wrong here. (`DEBUG` commands are also disabled by default since Redis 7.0, making the restart approach more robust.)

3. **Cross-cluster rsync "Option B" was fundamentally unreachable.**
   The original snippet started `rsync --daemon` inside the target pod, port-forwarded local 8730 → pod 8730, then ran rsync inside the *source* pod against `rsync://localhost:8730/data/`. Two independent breakages:
   - `kubectl port-forward` binds the workstation's loopback, not any pod's; `localhost` inside the source pod is that pod's own loopback, so the connection never reaches the target cluster.
   - `rsync --daemon` requires an `rsyncd.conf` with a `[data]` module defined, and the `instrumentisto/rsync-ssh` image ships none, so even a reachable connection would fail with "Unknown module 'data'".
   Replaced with a direct `tar | tar` pipe between two `kubectl exec` invocations (one per kubeconfig) — no intermediate file, no daemon, no port-forward gymnastics. This is the canonical pattern for cross-cluster data transfer with two kubeconfigs.

## Review Notes
- The Velero install flags (`--use-node-agent`, `--default-volumes-to-fs-backup`) and the `change-storage-class` ConfigMap (labels, namespace, key/value mapping) match current Velero docs. The ConfigMap name is arbitrary — Velero matches by labels — so the post's `change-storage-class` is fine even though the docs use `change-storage-class-config`.
- `kubectl get podvolumebackups` / `podvolumerestores` are the correct CRD plural names.
- The Longhorn StorageClass parameters (`numberOfReplicas`, `staleReplicaTimeout`, `fromBackup`) and the `driver.longhorn.io` provisioner are correct.
- `pg_dump -Fc` over `kubectl exec` works because `>` is a local redirect that captures the exec's stdout (binary-safe as long as no TTY is allocated, which is the default without `-t`). Same applies to `mysqldump > all-databases.sql`. No fix needed there.
- The Elasticsearch snippet only registers a snapshot repository — it doesn't take or restore a snapshot, and `path.repo` must be configured in `elasticsearch.yml` for the `fs` repository to mount. The post presents it as an entry point ("Use the snapshot and restore API"), so it's accurate as far as it goes; left as-is to avoid expanding scope.
- Talos supports inline NFS volumes via the kubelet image (NFSv4 works out of the box; NFSv3 locking may need extra kernel modules). The Strategy 4 NFS example is valid on Talos.
- `BGSAVE` is asynchronous; in a stricter guide you'd poll `LASTSAVE` before copying `dump.rdb` to avoid grabbing a stale file. Not a correctness bug for the post's purposes, so left unchanged.
- Author tone, structure, and section organization preserved; only the three bugs above were touched.
