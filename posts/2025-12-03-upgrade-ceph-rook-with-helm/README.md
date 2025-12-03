# How to Upgrade Ceph and Rook with Helm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Kubernetes, Helm, Storage, Bare Metal, DevOps

Description: A practical, battle-tested playbook for upgrading Rook and Ceph with Helm while keeping production PVCs healthy and teams calm.

---

## Why Helm-Led Upgrades Beat Ad-Hoc Ceph CLI

- **Single source of truth**: Desired versions, placement rules, and StorageClasses stay in Git as Helm values, so rollbacks are just another commit.
- **Coordinated CRD + operator rollouts**: The chart owns CRDs, webhooks, and RBAC, preventing skew between them.
- **Repeatable pipelines**: You can run the same upgrade chart in staging, staging+1, and prod with the exact diff shown in CI.
- **Instant observability hooks**: Helm values cleanly wire in Prometheus exporters so Ceph health immediately flows into OneUptime dashboards.

---

## Compatibility Mindset Before Touching Helm

| Desired Ceph Release | Tested Rook Helm Chart | Ceph Image Reference |
|----------------------|------------------------|----------------------|
| Reef (18.2.z)        | rook-ceph `v1.14.x`    | `quay.io/ceph/ceph:v18.2.2` |
| Quincy (17.2.z)      | rook-ceph `v1.12.x`    | `quay.io/ceph/ceph:v17.2.7` |
| Pacific (16.2.z)     | rook-ceph `v1.9.x`     | `quay.io/ceph/ceph:v16.2.15` |

Rook releases intentionally lag Ceph so that each operator knows how to orchestrate Mons, Mgrs, and OSDs for that generation. Never bump the Ceph image beyond what the operator chart documents—Helm won’t stop you, but the Mons might.

---

## Pre-Upgrade Checklist (30 Minutes Well Spent)

1. **Confirm all PGs are `active+clean`**:
   ```bash
   kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph -s
   ```
2. **Snapshot Helm values** so you can diff later:
   ```bash
   helm get values rook-ceph -n rook-ceph > pre-upgrade-values.yaml
   ```
3. **Back up cluster CRDs** (especially `CephBlockPool`, `CephObjectStore`, `CephFilesystem`) with `kubectl get -oyaml`.
4. **Patch disruption budgets** for apps backed by Ceph PVCs so they can survive slower IO during rebalancing.
5. **Schedule pager coverage**: create a OneUptime maintenance window, but keep an on-call looking at Ceph health and OpenTelemetry signals.

---

## Phase 1: Upgrade the Rook Operator

1. **Update the chart repo**:
   ```bash
   helm repo add rook-release https://charts.rook.io/release
   helm repo update
   ```
2. **Render the diff** between current and target versions:
   ```bash
   helm diff upgrade rook-ceph rook-release/rook-ceph \
     --namespace rook-ceph \
     --version v1.14.2 \
     -f values/rook/operator.yaml
   ```
3. **Apply the upgrade**:
   ```bash
   helm upgrade --install rook-ceph rook-release/rook-ceph \
     --namespace rook-ceph \
     --version v1.14.2 \
     -f values/rook/operator.yaml
   ```
4. **Watch the operator** restart once and reconcile:
   ```bash
   kubectl -n rook-ceph rollout status deploy/rook-ceph-operator
   kubectl -n rook-ceph logs deploy/rook-ceph-operator -f | grep "ceph version"
   ```

Once the operator is healthy it automatically refreshes CRDs so the cluster CRs understand the new schema.

---

## Phase 2: Upgrade the Ceph Cluster

1. **Edit the cluster values file** to point at the new Ceph image and feature flags:
   ```yaml
   cephClusterSpec:
     cephVersion:
       image: quay.io/ceph/ceph:v18.2.2
     manager:
       modules:
         - name: pg_autoscaler
           enabled: true
     dashboard:
       enabled: true
   cephBlockPools:
     - name: fast-rbd
       spec:
         replicated:
           size: 3
         deviceClass: nvme
   ```
2. **Dry-run the cluster chart** so you can review the CR diff:
   ```bash
   helm upgrade rook-ceph-cluster rook-release/rook-ceph-cluster \
     --namespace rook-ceph \
     --version v1.14.2 \
     -f values/rook/cluster.yaml \
     --dry-run
   ```
3. **Apply the upgrade** when the diff looks good:
   ```bash
   helm upgrade rook-ceph-cluster rook-release/rook-ceph-cluster \
     --namespace rook-ceph \
     --version v1.14.2 \
     -f values/rook/cluster.yaml
   ```
4. **Track component rollouts**:
   ```bash
   kubectl -n rook-ceph get pods -l app=rook-ceph-mgr -w
   kubectl -n rook-ceph get pods -l app=rook-ceph-mon -w
   kubectl -n rook-ceph get pods -l app=rook-ceph-osd --sort-by=.status.startTime
   ```
   OSDs are drained and restarted in batches. If you tagged devices by topology, CRUSH will keep placement sane during the shuffle.

---

## Phase 3: Validate, Roll Forward, or Roll Back

- **Health gate**:
  ```bash
  kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph versions
  kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph health detail
  ```
- **StorageClasses**: `kubectl get sc -l rook-ceph` and create a disposable PVC to confirm the CSI sidecars picked up the new image.
- **Rollback plan**: Helm stores the previous release. Downgrade the operator with `helm rollback rook-ceph <rev>` if Mons fail to form quorum; the Ceph data path will stay intact as long as the image tag still exists locally.
- **Error budget check**: Watch OneUptime dashboards during the upgrade window. If degraded PGs exceed your agreed SLO for 10 minutes, stop and stabilize before re-attempting.

---

## Automate Observability and Alerting

1. **Ceph exporter → OpenTelemetry → OneUptime**
   - Enable the Prometheus exporter module via Helm values: `cephClusterSpec.mgr.modules[].name: prometheus`.
   - Scrape it with an OpenTelemetry Collector `prometheusreceiver` and forward metrics plus alerts into OneUptime so on-call sees PG recovery rates alongside cluster CPU and disk temps.
2. **Upgrade traces**: Wrap your Helm pipelines with OpenTelemetry span annotations (GitHub Actions + `otel-cli`) so every upgrade has a trace ID you can paste into incident threads.
3. **Synthetic probes**: Configure OneUptime synthetic checks that create PVCs in a canary namespace every 15 minutes. If provisioning slows after an upgrade, you learn it before prod workloads do.

---

## Runbook Snippets You Can Reuse

- **Quick status**:
  ```bash
  kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph orch ps --daemon-type osd
  ```
- **Pause the upgrade**:
  ```bash
  kubectl -n rook-ceph annotate cephcluster rook-ceph spec.allowMultipleOSDDaemons=false --overwrite
  ```
  This throttles OSD restarts when your disks are saturated.
- **Post-upgrade cleanup**: prune unused container images and delete `rook-ceph` jobs left in `Completed` state to quiet `kubectl get pods` output.

Helm keeps the control plane boring. Pair it with Ceph’s self-healing data path, plus continuous telemetry in OneUptime, and Rook upgrades stop being a weekend-only ritual.
