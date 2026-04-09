# Validation Summary: How to Configure Read Affinity with CRUSH Location Labels in Rook CSI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- ceph-csi (CSI driver for Ceph)
- Kubernetes (topology labels, ConfigMaps, DaemonSets)
- CRUSH (Controlled Replication Under Scalable Hashing) map

## Sources Consulted
- Rook documentation: CephCluster CRD (`Documentation/CRDs/Cluster/ceph-cluster-crd.md`) for supported topology labels
- Rook documentation: Ceph CSI Drivers (`Documentation/Storage-Configuration/Ceph-CSI/ceph-csi-drivers.md`) for read affinity configuration via CephCluster CR
- Rook source code: `pkg/operator/ceph/csi/spec.go` for ConfigMap name (`rook-ceph-csi-config`) and data key (`csi-cluster-config-json`)
- ceph-csi source code: `internal/util/crushlocation.go` and `crushlocation_test.go` for label-to-CRUSH-bucket mapping logic
- ceph-csi source code: `internal/util/read_affinity.go` for `read_from_replica=localize,crush_location=` KRBD map option construction
- ceph-csi source code: `api/deploy/kubernetes/csi-config-map.go` for `readAffinity` struct definition
- Ceph documentation: `ceph osd perf` command output format (columns: `commit_latency`, `apply_latency`)

## Issues Found

### 1. Fabricated CRUSH location label (`topology.rook.io/crush-location` with JSON values)
**What was wrong:** The post used a non-existent label `topology.rook.io/crush-location` with JSON-encoded values like `'{"host":"worker-01","zone":"zone-a"}'`. This label does not exist in Rook or ceph-csi. The ceph-csi driver expects standard Kubernetes topology labels with simple string values, where the label name suffix (after `/`) becomes the CRUSH bucket type and the label value becomes the bucket name.

**What was changed:** Replaced with correct standard topology labels: `topology.kubernetes.io/zone` for zone-level placement and `topology.rook.io/rack` for rack-level, with simple string values (e.g., `zone-a`, `rack-01`). Noted that `kubernetes.io/hostname` is typically auto-applied.

### 2. Manual CSI ConfigMap editing instead of CephCluster CR
**What was wrong:** The post instructed users to manually edit the `rook-ceph-csi-config` ConfigMap. The Rook operator manages this ConfigMap automatically and will overwrite manual edits. Additionally, the data key was shown as `config.json` when the correct key is `csi-cluster-config-json`.

**What was changed:** Replaced with the official Rook-recommended approach: patching the CephCluster CR at `spec.csi.readAffinity` using `kubectl patch`. Included both a CLI one-liner and equivalent YAML snippet. Explained how the operator propagates the configuration.

### 3. Incorrect `crushLocationLabels` values
**What was wrong:** The `crushLocationLabels` array contained `topology.rook.io/crush-location` (the fabricated label). It should list real Kubernetes topology label names.

**What was changed:** Updated to `["topology.kubernetes.io/zone", "kubernetes.io/hostname"]` which are standard and commonly used labels.

### 4. Invalid `ceph osd perf | grep read_latency` command
**What was wrong:** `ceph osd perf` outputs `commit_latency(ms)` and `apply_latency(ms)` columns only. There is no `read_latency` column, so the grep would return no results.

**What was changed:** Removed the `| grep read_latency` pipe. The command now shows all OSD latency metrics, which is the correct way to monitor overall OSD performance.

### 5. Missing kernel version requirement
**What was wrong:** The post did not mention that read affinity requires Linux kernel 5.8+ for the `read_from_replica` KRBD map option.

**What was changed:** Added kernel 5.8+ as a requirement in the Performance Considerations section.

### 6. CSI restart note
**What was wrong:** The post stated a manual restart is required after updating the config. When using the CephCluster CR approach, the operator typically handles pod restarts.

**What was changed:** Added a note that the operator typically restarts CSI pods automatically, with the manual restart command retained as a fallback.

### 7. Expected log line and summary references
**What was wrong:** Referenced the fabricated `topology.rook.io/crush-location` label.

**What was changed:** Updated to reflect the corrected label names.

## Review Notes
- The `ceph osd perf` command shows commit and apply latency at the OSD level, not client-side read latency specifically. For more granular read latency metrics, users could use Prometheus/Grafana with Ceph metrics exporters, but the current command is adequate for a general overview.
- Read affinity is explicitly disabled for Ceph v20.2.0 due to a known corruption bug (tracked in the Rook source at `pkg/operator/ceph/csi/ceph_connection.go`). The post does not mention specific Ceph version caveats, which could be a useful addition in the future.
- The post correctly notes that read affinity works best with replicated pools (not erasure coded), which is accurate.
