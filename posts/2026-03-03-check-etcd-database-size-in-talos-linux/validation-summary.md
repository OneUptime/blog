# Validation Summary: How to Check etcd Database Size in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl)
- etcd (v3.5.x, etcdctl, MVCC backend)
- Kubernetes (API server health endpoints, Pod manifests, hostPath volumes)
- Prometheus (metrics, PromQL, prometheus-operator PrometheusRule CRD)
- Grafana (dashboards for capacity tracking)

## Sources Consulted
- Talos etcd Maintenance docs — https://www.talos.dev/v1.11/advanced/etcd-maintenance/
- Talos Pod Security docs — https://www.talos.dev/v1.10/kubernetes-guides/configuration/pod-security/
- siderolabs/talos issue #3943 (restrict /system mounts) — https://github.com/siderolabs/talos/issues/3943
- etcd metrics reference — https://etcd.io/docs/v3.4/metrics/
- etcd "how to debug large db size" blog — https://etcd.io/blog/2023/how_to_debug_large_db_size_issue/
- etcd PR #8280 (compaction_keys_total metric) — https://github.com/etcd-io/etcd/pull/8280
- etcd v3.5.12 release — https://github.com/etcd-io/etcd/releases/tag/v3.5.12
- Kubernetes API health checks reference — https://kubernetes.io/docs/reference/using-api/health-checks/

## Issues Found
1. **Incorrect default quota claim.** The post stated Talos commonly uses an 8GB etcd quota by default. Talos uses the upstream etcd default of 2GB unless overridden; 8GB is the recommended maximum, not a Talos default. Reworded to clarify the default is 2GB and that 8GB is the upstream-recommended ceiling.
2. **Incomplete `talosctl etcd status` example output.** The example was missing the `NODE` column at the start and the `LEARNER` column at the end. Updated the example to reflect the actual column layout, including the percentage-in-parentheses formatting in the IN USE column.
3. **Misleading metric comment.** The comment on `etcd_debugging_mvcc_db_compaction_keys_total` said it indicates "how much compaction could help" — this metric actually counts keys already removed by past compactions, so it does not predict future reclaimable space. Rewrote the comment.
4. **Missing Pod Security caveat for Method 2.** Talos applies the `baseline` Pod Security Admission profile by default, which blocks `hostPath` volumes outside `kube-system`. Added a short note before the pod manifest so readers understand why the namespace and PSA settings matter.

## Review Notes
- The `etcd_debugging_*` metrics used in Methods 3 and "Tracking Size Over Time" are documented by etcd as unstable and may be removed without notice. Acceptable for monitoring today, but worth a note in a future revision.
- The Kubernetes individual health checks (`/healthz/etcd`, `/livez/etcd`, etc.) are documented as alpha and intended primarily for human debugging rather than machine consumption. The post's usage (manual checks alongside metrics) is appropriate.
- The etcdctl pod uses `peer.crt`/`peer.key` for client authentication. This works because Talos peer certs include client auth EKU, but a dedicated client cert would be more conventional. Not changed because it is functional and matches what is mounted from `/system/secrets/etcd`.
- `gcr.io/etcd-development/etcd:v3.5.12` is a valid official image; etcd is also publishing via `registry.k8s.io/etcd` as a mirror in newer guidance.
