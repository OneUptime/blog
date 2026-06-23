# Validation Summary: How to Upgrade Ceph and Rook with Helm

## Status
validated

## Post Type
Tutorial / operational runbook (step-by-step upgrade guide)

## Technologies Covered
- Ceph (Reef / Quincy / Pacific releases)
- Rook (rook-ceph and rook-ceph-cluster Helm charts)
- Kubernetes (kubectl)
- Helm (including the helm-diff plugin)
- OpenTelemetry / Prometheus exporter
- OneUptime (observability/alerting)

## Sources Consulted
- Rook CephCluster CRD configuration — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Ceph Cluster Helm Chart values — https://rook.io/docs/rook/latest-release/Helm-Charts/ceph-cluster-chart/ and https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph-cluster/values.yaml
- Rook Ceph upgrade docs (skipUpgradeChecks, rolling daemon upgrade behavior) — https://rook.io/docs/rook/v1.9/ceph-upgrade.html
- Ceph mgr Orchestrator / Rook backend module — https://docs.ceph.com/en/reef/mgr/orchestrator/ and https://docs.ceph.com/en/reef/mgr/orchestrator_modules/
- Ceph release/image references on quay.io/ceph/ceph

## Issues Found
1. **Incorrect CephCluster spec field name (`manager` → `mgr`).** The Phase 2 cluster values YAML defined the manager modules under `cephClusterSpec.manager:`. The CephCluster CRD field is `mgr` (e.g. `mgr.count`, `mgr.modules`), not `manager`. As written the modules block would be silently ignored / rejected. Fixed to `mgr:`. (Note: the post's own Observability section already correctly references `cephClusterSpec.mgr.modules[].name`, confirming the inconsistency.)

2. **Invalid "pause the upgrade" command.** The runbook used `kubectl -n rook-ceph annotate cephcluster rook-ceph spec.allowMultipleOSDDaemons=false --overwrite`. This is wrong on two counts: (a) `allowMultipleOSDDaemons` is not a real CephCluster field or annotation, and (b) `kubectl annotate` cannot set `spec.*` fields — annotations and spec are different objects. The documented way to halt in-progress orchestration (including OSD restarts) is to scale the operator deployment to zero. Replaced with `kubectl -n rook-ceph scale deploy rook-ceph-operator --replicas=0` (plus a `--replicas=1` line to resume) and updated the surrounding narration accordingly.

## Review Notes
- The compatibility table (Reef/18.2.x ↔ rook-ceph v1.14.x, Quincy/17.2.x ↔ v1.12.x, Pacific/16.2.x ↔ v1.9.x) is reasonable, and the pinned images (`v18.2.2`, `v17.2.7`, `v16.2.15`) are real published tags on quay.io/ceph/ceph. These are point-in-time references and will continue to age (e.g. newer Reef patch releases and Squid/v19 now exist) — accurate for the post's date.
- `dashboard:` as a top-level field of `cephClusterSpec` is correct (it is a top-level CephCluster spec field, separate from `mgr`), so it was left unchanged.
- The `ceph orch ps --daemon-type osd` runbook command is valid, but only after the Rook orchestrator backend is enabled (`ceph mgr module enable rook` + `ceph orch set backend rook`), which is not configured by default and has limitations (e.g. no OSD creation via `ceph orch`). For a quick OSD status check that always works in a Rook cluster, `ceph osd status` / `ceph osd tree` is a more robust alternative. Left as-is since the command is technically correct when the backend is configured.
- `kubectl get sc -l rook-ceph` relies on a label selector key existing on the StorageClasses; this is environment-dependent but harmless as an illustrative example.
- All other commands (`ceph -s`, `ceph versions`, `ceph health detail`, `helm get values`, `helm diff upgrade`, `helm upgrade --install`, `helm rollback`, `kubectl rollout status`, label-based pod watches) are syntactically correct and current.
