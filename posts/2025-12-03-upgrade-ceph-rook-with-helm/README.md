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

Rook releases intentionally lag Ceph so that each operator knows how to orchestrate Mons, Mgrs, and OSDs for that generation. Never bump the Ceph image beyond what the operator chart documents-Helm won’t stop you, but the Mons might.

---

## Pre-Upgrade Checklist (30 Minutes Well Spent)

1. **Confirm all PGs are `active+clean`**:

   This command checks cluster health status. Never start an upgrade when placement groups are degraded or recovering - you risk data loss if something goes wrong mid-upgrade.

   ```bash
   # Connect to the Ceph tools pod and check overall cluster status
   kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph -s
   ```
2. **Snapshot Helm values** so you can diff later:

   Capturing your current values provides a rollback safety net. If the upgrade fails, you can compare what changed and restore the previous configuration quickly.

   ```bash
   # Export current Helm values to a file for comparison and potential rollback
   helm get values rook-ceph -n rook-ceph > pre-upgrade-values.yaml
   ```
3. **Back up cluster CRDs** (especially `CephBlockPool`, `CephObjectStore`, `CephFilesystem`) with `kubectl get -oyaml`.
4. **Patch disruption budgets** for apps backed by Ceph PVCs so they can survive slower IO during rebalancing.
5. **Schedule pager coverage**: create a OneUptime maintenance window, but keep an on-call looking at Ceph health and OpenTelemetry signals.

---

## Phase 1: Upgrade the Rook Operator

1. **Update the chart repo**:

   Ensure you have the latest chart definitions before upgrading. Stale repo data can cause you to miss critical patches or security fixes.

   ```bash
   # Add or refresh the Rook Helm repository
   helm repo add rook-release https://charts.rook.io/release

   # Fetch latest chart metadata
   helm repo update
   ```
2. **Render the diff** between current and target versions:

   The diff plugin shows exactly what will change before you commit. Review CRD changes, RBAC modifications, and image tags carefully - surprises here cause outages.

   ```bash
   # Preview all changes between current state and target version
   helm diff upgrade rook-ceph rook-release/rook-ceph \
     --namespace rook-ceph \
     --version v1.14.2 \                    # Target Rook operator version
     -f values/rook/operator.yaml           # Your custom operator settings
   ```
3. **Apply the upgrade**:

   This command performs the actual upgrade. The operator pod will restart and begin reconciling all Ceph CRDs with the new controller logic.

   ```bash
   # Execute the operator upgrade
   helm upgrade --install rook-ceph rook-release/rook-ceph \
     --namespace rook-ceph \
     --version v1.14.2 \                    # Pin to specific version for reproducibility
     -f values/rook/operator.yaml           # Apply your custom configuration
   ```
4. **Watch the operator** restart once and reconcile:

   Monitor the rollout to ensure the new operator starts cleanly. The logs should show it detecting and adopting the existing Ceph cluster without errors.

   ```bash
   # Wait for the operator deployment to complete its rollout
   kubectl -n rook-ceph rollout status deploy/rook-ceph-operator

   # Stream logs and verify the operator recognizes the Ceph version
   kubectl -n rook-ceph logs deploy/rook-ceph-operator -f | grep "ceph version"
   ```

Once the operator is healthy it automatically refreshes CRDs so the cluster CRs understand the new schema.

---

## Phase 2: Upgrade the Ceph Cluster

1. **Edit the cluster values file** to point at the new Ceph image and feature flags:

   This YAML configures the Ceph version, enables useful management modules, and defines your storage pool topology. Changing the image tag here triggers the actual Ceph daemon upgrades.

   ```yaml
   cephClusterSpec:
     cephVersion:
       image: quay.io/ceph/ceph:v18.2.2    # New Ceph Reef release with latest fixes
     manager:
       modules:
         - name: pg_autoscaler             # Automatically adjusts PG counts as cluster grows
           enabled: true
     dashboard:
       enabled: true                       # Keep the web UI for visual health checks
   cephBlockPools:
     - name: fast-rbd                      # Your primary block storage pool
       spec:
         replicated:
           size: 3                         # Maintain triple replication for durability
         deviceClass: nvme                 # Pin this pool to NVMe OSDs for performance
   ```
2. **Dry-run the cluster chart** so you can review the CR diff:

   A dry-run renders the manifests without applying them. Use this to catch configuration mistakes before they affect your live storage cluster.

   ```bash
   # Preview the upgrade without making any changes
   helm upgrade rook-ceph-cluster rook-release/rook-ceph-cluster \
     --namespace rook-ceph \
     --version v1.14.2 \                   # Match the operator version
     -f values/rook/cluster.yaml \         # Your cluster configuration
     --dry-run                             # Render only - do not apply
   ```
3. **Apply the upgrade** when the diff looks good:

   This triggers the Rook operator to orchestrate a rolling upgrade of all Ceph daemons. Mons upgrade first, then managers, then OSDs in controlled batches.

   ```bash
   # Execute the cluster upgrade - Rook handles the rolling restart sequence
   helm upgrade rook-ceph-cluster rook-release/rook-ceph-cluster \
     --namespace rook-ceph \
     --version v1.14.2 \                   # Target chart version
     -f values/rook/cluster.yaml           # Apply your storage configuration
   ```
4. **Track component rollouts**:

   Watch each daemon type restart in sequence. The upgrade is safe as long as you see pods cycling through terminating and running states without errors or extended pending times.

   ```bash
   # Watch manager pods upgrade (typically one at a time)
   kubectl -n rook-ceph get pods -l app=rook-ceph-mgr -w

   # Watch monitor pods upgrade (maintains quorum throughout)
   kubectl -n rook-ceph get pods -l app=rook-ceph-mon -w

   # Watch OSD pods sorted by start time to see upgrade progression
   kubectl -n rook-ceph get pods -l app=rook-ceph-osd --sort-by=.status.startTime
   ```
   OSDs are drained and restarted in batches. If you tagged devices by topology, CRUSH will keep placement sane during the shuffle.

---

## Phase 3: Validate, Roll Forward, or Roll Back

- **Health gate**:

  After the upgrade completes, verify all daemons report the new version and the cluster shows HEALTH_OK. Mixed versions during upgrade are normal, but they should converge within minutes.

  ```bash
  # Confirm all daemons are running the expected Ceph version
  kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph versions

  # Check for any health warnings or errors introduced by the upgrade
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

  This command shows all OSD daemons with their status, version, and placement. Use it to quickly identify any OSDs stuck in a failed state during upgrades.

  ```bash
  # List all OSD daemons with their current state and version
  kubectl -n rook-ceph exec deploy/rook-ceph-tools -- ceph orch ps --daemon-type osd
  ```
- **Pause the upgrade**:

  If you notice performance degradation or need to pause for investigation, this annotation tells Rook to stop restarting additional OSDs until you are ready to continue.

  ```bash
  # Add annotation to pause OSD rolling restarts
  kubectl -n rook-ceph annotate cephcluster rook-ceph spec.allowMultipleOSDDaemons=false --overwrite
  ```
  This throttles OSD restarts when your disks are saturated.
- **Post-upgrade cleanup**: prune unused container images and delete `rook-ceph` jobs left in `Completed` state to quiet `kubectl get pods` output.

Helm keeps the control plane boring. Pair it with Ceph’s self-healing data path, plus continuous telemetry in OneUptime, and Rook upgrades stop being a weekend-only ritual.
