# Validation Summary: How to Run Ceph in a Single-Node Test Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (v18.2.0 / Reef release)
- Kubernetes (kubectl, CRDs)
- Helm
- CephBlockPool and CephFilesystem CRDs
- Linux loop devices for OSD storage

## Sources Consulted
- Rook CephCluster CRD source code (`pkg/apis/ceph.rook.io/v1/types.go`) — confirmed `mgr.allowMultiplePerNode` is a valid field
- Rook official test cluster example (`deploy/examples/cluster-test.yaml`) — compared YAML structure and fields
- Rook official quickstart documentation (https://rook.io/docs/rook/latest-release/Getting-Started/quickstart/) — confirmed toolbox requires separate deployment
- Rook toolbox manifest (`deploy/examples/toolbox.yaml`) — confirmed it is not included in the operator Helm chart
- Ceph Reef source code (`src/common/options/global.yaml.in`) — verified config option names and defaults
- Ceph health monitor source code (`HealthMonitor.cc`) — verified warning trigger conditions
- CVE-2021-20288 documentation — confirmed `auth_allow_insecure_global_id_reclaim` is a security fix, not a single-node setting

## Issues Found

### 1. Missing toolbox deployment in shell script
**What was wrong:** The shell script ended with `kubectl exec deploy/rook-ceph-tools -- ceph status`, but the Rook toolbox deployment was never created. The toolbox is a separate manifest not included in the `rook-ceph` operator Helm chart, so this command would fail with a "deployment not found" error.

**What was changed:** Added toolbox deployment commands before the final `ceph status` call:
```bash
kubectl apply -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/toolbox.yaml
kubectl -n rook-ceph rollout status deploy/rook-ceph-tools --timeout=60s
```
Also removed the `-it` flags from the script's `kubectl exec` since scripts run non-interactively.

### 2. Incorrect warning suppression commands in health check section
**What was wrong:** The health check section labeled CVE-2021-20288 security warnings (`mon_warn_on_insecure_global_id_reclaim`, `auth_allow_insecure_global_id_reclaim`) as "single-node warnings." These are general security settings unrelated to single-node topology. In a fresh Ceph Reef cluster with modern clients, these warnings would not appear anyway.

**What was changed:** Replaced the two CVE-related config commands with the actually relevant single-node warning suppression:
```bash
ceph config set global mon_warn_on_pool_no_redundancy false
```
This suppresses the `POOL_NO_REDUNDANCY` warning that genuinely appears on single-node clusters using `replicated.size: 1` pools.

## Review Notes
- The CephCluster YAML structure, field names, and values are all correct and match the official Rook `cluster-test.yaml` example.
- `mgr.allowMultiplePerNode` is a valid field confirmed in Rook source code, though it is not fully documented on the Rook website docs (only the `mon` version is documented there).
- The Ceph image `quay.io/ceph/ceph:v18.2.0` is a valid Reef release image.
- The Helm repo URL `https://charts.rook.io/release` and chart name `rook-ceph` are correct.
- The `kubectl wait --for=jsonpath=` syntax requires kubectl 1.23+, which is not noted but is a reasonable assumption for modern clusters.
- The script creates a loop device on the host; for container-based local Kubernetes (kind, Docker Desktop), the loop device may need to be created inside the node container rather than on the host. This is not an error but could be clarified for specific environments.
