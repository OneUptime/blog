# Validation Summary: How to Run etcd Standalone Cluster on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- etcd v3.5.12 (key-value store)
- Talos Linux
- Kubernetes (StatefulSet, Service, CronJob)
- cert-manager (TLS certificate issuance)
- etcdctl (etcd CLI)
- Prometheus Operator (ServiceMonitor)

## Sources Consulted
- etcd v3.5.12 release Dockerfile (etcd-io/etcd repo): https://github.com/etcd-io/etcd/blob/v3.5.12/Dockerfile-release.amd64
- etcd configuration reference: https://etcd.io/docs/v3.5/op-guide/configuration/
- Kubernetes documentation on environment variable substitution in args: https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/
- cert-manager v1 API reference (Issuer, Certificate): https://cert-manager.io/docs/reference/api-docs/
- Prometheus Operator ServiceMonitor reference: https://prometheus-operator.dev/docs/api-reference/api/
- Docker Hub: bitnami/etcd (verified the image catalog is no longer providing free 3.5.12 tags)

## Issues Found

1. **Shell-based container `command` will not run on the distroless etcd image.**
   - The post used `command: ["/bin/sh", "-c", "..."]` for the StatefulSet, livenessProbe, and backup CronJob. The official `quay.io/coreos/etcd:v3.5.12` image is built `FROM gcr.io/distroless/static-debian11` (verified against the etcd v3.5.12 release Dockerfile) and ships only the `etcd`, `etcdctl`, and `etcdutl` binaries — no shell, no `find`, no `date`. Every container that depended on `/bin/sh` would fail to start with `exec: "/bin/sh": stat /bin/sh: no such file or directory`.
   - Fix: Replaced the shell-driven scripts with `command: [etcd]` (or `[etcdctl]`) plus a structured `args:` list, using Kubernetes `$(VAR)` env-var substitution. Removed the now-unused `CLUSTER_SIZE` env var and hardcoded the 3-node `--initial-cluster` peer list (which the shell script was generating dynamically). The livenessProbe was rewritten to invoke `etcdctl endpoint health` directly without a shell wrapper.

2. **Backup CronJob relied on `date` and `find` which are not in the distroless image.**
   - Fix: Switched to invoking `etcdctl snapshot save` directly with the snapshot filename built from `$(JOB_NAME)` via the downward API (`metadata.labels['job-name']`), which yields a unique, time-correlated filename per CronJob run without needing a shell or `date`. The `find -mtime +7 -delete` retention sweep was removed because it cannot run in a distroless image; users wanting snapshot rotation should add a separate retention mechanism (e.g., a sidecar/cleanup job using a shell-equipped image, or external lifecycle policies on the backup volume).

3. **ServiceMonitor selector would not match either Service.**
   - The `ServiceMonitor.spec.selector.matchLabels: { app: etcd }` matches against Service labels, not Pod labels. Neither `etcd-headless` nor `etcd-client` Service had any labels, so the selector matched nothing and Prometheus would never scrape.
   - Fix: Added `metadata.labels: { app: etcd }` to both Services so the ServiceMonitor selector matches.

## Review Notes

- **Bitnami's etcd image was not a viable substitute.** I considered switching to `bitnami/etcd:3.5.12` to preserve the shell-based command structure, but Docker Hub no longer serves free Bitnami catalog tags for this image (and the `bitnamilegacy/etcd` mirror only goes up to 3.5.9). Restructuring around the distroless official image was the right call.
- **Hardcoded `--initial-cluster` peer list.** Because the shell loop is gone, the peer list for the 3 replicas is now spelled out literally in `args`. If the user scales `replicas` beyond 3, they must extend this string by hand. This is a deliberate trade-off — Kubernetes does not have a portable, shell-free way to template a comma-joined list of pod ordinals into a single argument.
- **`/metrics` requires client cert auth.** Because the post sets `--client-cert-auth=true`, the `/metrics` endpoint on port 2379 requires a client certificate. The ServiceMonitor's `tlsConfig` does include client certs, but the secrets it references (`/etc/prometheus/secrets/etcd-ca`, `/etc/prometheus/secrets/etcd-cert`) must be wired into the Prometheus pod separately via the Prometheus Operator's `secrets:` field. The post mentions this is "if you are running Prometheus Operator" so the prerequisite is acknowledged, but the secret-mounting step is left to the reader.
- **`--auto-compaction-retention=1`** is 1 hour in the default `periodic` mode (verified against etcd v3.5 docs). This is aggressive but valid; for low-write workloads it may compact more often than necessary.
- **`--quota-backend-bytes=8589934592`** is 8 GiB, matching the etcd-recommended upper bound for the v3.5 backend.
- **Snapshot retention is the user's responsibility now.** This is a meaningful functional reduction from the original draft. A follow-up improvement would be to add a small companion cleanup CronJob (using e.g. `busybox`) that mounts the same `backup-volume` PVC and prunes old `*.db` files.
