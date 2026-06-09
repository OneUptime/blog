# Validation Summary: How to Use Fluent Bit with Kubernetes

## Status
validated

## Post Type
Tutorial / Guide — step-by-step walkthrough of deploying Fluent Bit on Kubernetes as a DaemonSet, including RBAC, ConfigMap, parsers, filters, and an HTTP output.

## Technologies Covered
- Fluent Bit (log processor, classic `[SECTION]` config format)
- Kubernetes (Namespace, ServiceAccount, ClusterRole, ClusterRoleBinding, DaemonSet, ConfigMap, Secret)
- CRI / containerd log format
- Docker JSON log format
- Prometheus metrics endpoint
- HTTP output to OneUptime

## Sources Consulted
- Fluent Bit official manual — Tail input: https://docs.fluentbit.io/manual/pipeline/inputs/tail
- Fluent Bit official manual — Kubernetes filter: https://docs.fluentbit.io/manual/pipeline/filters/kubernetes
- Fluent Bit official manual — Grep filter: https://docs.fluentbit.io/manual/pipeline/filters/grep
- Fluent Bit official manual — Monitoring / HTTP server: https://docs.fluentbit.io/manual/administration/monitoring
- Fluent Bit project parsers.conf (canonical CRI parser): https://github.com/fluent/fluent-bit/blob/master/conf/parsers.conf
- Fluent Bit Helm chart manifests (DaemonSet volume layout reference)
- Docker Hub `fluent/fluent-bit` tags: https://hub.docker.com/r/fluent/fluent-bit/tags
- Fluent Bit "Fluentd & Fluent Bit" comparison (memory footprint claim): https://docs.fluentbit.io/manual/about/fluentd-and-fluent-bit

## Issues Found

1. **Incorrect comment on `Skip_Long_Lines`.** The original comment described it as "Start reading from the end of files on first run." That behavior is controlled by `Read_from_Head` (default Off). `Skip_Long_Lines On` actually skips lines that exceed the buffer size instead of failing the read. Comment was rewritten to accurately describe the option.

2. **Inverted comment on `Keep_Log Off`.** The original comment said "Keep the original log field after merging," which describes `Keep_Log On`. With `Keep_Log Off`, Fluent Bit removes the original `log` field after a successful merge. Comment was corrected.

3. **Read-only `/var/log` mount conflicted with the tail DB path.** The DaemonSet mounted `/var/log` as `readOnly: true`, but the tail input had `DB /var/log/flb_kube.db`. The tail DB is a SQLite file that Fluent Bit must write to; this configuration would fail at runtime. Fix: moved the DB path to `/var/fluent-bit/state/flb_kube.db` and added a dedicated writable hostPath volume (`flb-state` → `/var/lib/fluent-bit`, `type: DirectoryOrCreate`) mounted at `/var/fluent-bit/state`. The `/var/log` mount stays read-only as intended.

4. **Outdated container image.** The DaemonSet pinned `fluent/fluent-bit:2.2` (a 2.2.x line released in late 2023). For a post dated Feb 2026, this is several major versions behind (3.x shipped in 2024, 4.x in 2025). Updated to `fluent/fluent-bit:3.2`, which is a reasonable, stable tag and uses the same classic config syntax shown in the post.

## Review Notes
- Memory footprint claim of "~450KB" is consistent with Fluent Bit's official comparison documentation.
- CRI parser regex and time format (`%Y-%m-%dT%H:%M:%S.%L%z`) match the canonical `parsers.conf` from the upstream repo. The named group `<log>` differs from the upstream `<message>` but both are functionally equivalent — the kubernetes filter operates on the field actually emitted.
- Health endpoint `/api/v1/health` and Prometheus endpoint `/api/v1/metrics/prometheus` are both valid. Note: a v2 health endpoint (`/api/v2/health`) is also available and returns proper HTTP status codes with JSON — slightly preferred for k8s probes but v1 still works. Left as-is.
- Grep filter record-accessor syntax `$kubernetes['namespace_name']` is the documented form for nested fields and is correct.
- The `fluentbit.io/parser` pod annotation is the correct trigger when `K8S-Logging.Parser On` is set.
- The `node-role.kubernetes.io/master` toleration is for backwards compatibility with pre-1.24 clusters; the taint was removed in 1.25. It's harmless on modern clusters and the post already includes the modern `control-plane` toleration, so left as-is.
- The architecture diagram simplifies the pod-to-log-file relationship (in reality the container runtime writes to `/var/log/pods/...` which is then symlinked from `/var/log/containers/`), but is conceptually accurate for an overview.
