# Validation Summary: How to Handle Rook-Ceph Operator Failures

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage operator)
- Kubernetes (kubectl, Deployments, ConfigMaps, CRDs, Leases, RBAC)
- Ceph (CephCluster, CephBlockPool, CephFilesystem, CephObjectStore)

## Sources Consulted
- Rook GitHub repository source code: https://github.com/rook/rook
  - `pkg/operator/ceph/cr_manager.go` — confirmed operator does not use leader election (`LeaderElection: false`)
  - `pkg/apis/ceph.rook.io/v1/labels.go` — confirmed `SkipReconcileLabelKey = "ceph.rook.io/do-not-reconcile"` (label, not annotation)
  - `pkg/operator/ceph/cluster/predicate.go` — confirmed do-not-reconcile is checked via `GetLabels()`, not annotations
  - `pkg/operator/k8sutil/configmap.go` — confirmed operator does not auto-recreate the ConfigMap
  - `deploy/examples/common.yaml` — confirmed operator ServiceAccount is `rook-ceph-system`
  - `deploy/examples/operator.yaml` — confirmed `serviceAccountName: rook-ceph-system`, `replicas: 1`, `strategy: Recreate`, and valid `ROOK_LOG_LEVEL` values (ERROR, WARNING, INFO, DEBUG)
- Rook official documentation: https://rook.github.io/docs/rook/latest/

## Issues Found

1. **Step 2 — Incorrect service account name in example error message.** The blog showed the RBAC error as `system:serviceaccount:rook-ceph:rook-ceph-operator`. The default Rook operator ServiceAccount is `rook-ceph-system`, not `rook-ceph-operator` (`rook-ceph-operator` is the Deployment name). Changed to `rook-ceph-system`.

2. **Step 4 — Wrong API prefix and resource type for reconciliation control.** The blog used `kubectl annotate` with `rook.io/do-not-reconcile=true`. Three errors: (a) it is a **label**, not an annotation; (b) the correct prefix is `ceph.rook.io`, not `rook.io`; (c) the correct key is `ceph.rook.io/do-not-reconcile`. Changed `kubectl annotate` to `kubectl label` and corrected the key to `ceph.rook.io/do-not-reconcile`.

3. **Step 6 — Rook operator does not use leader election.** The entire section about leader election leases was incorrect. The Rook operator sets `LeaderElection: false` in its controller-runtime manager configuration and instead relies on `replicas: 1` with `strategy: Recreate` to ensure a single instance. Leader election leases in the `rook-ceph` namespace belong to CSI provisioner sidecars, not the operator. Rewrote this step to address the actual failure mode: stuck terminating pods preventing the replacement pod from starting under the Recreate strategy.

4. **Step 7 — Incorrect claim about ConfigMap auto-recreation.** The blog stated "Rook will recreate it with defaults when the operator restarts." The operator does not recreate the `rook-ceph-operator-config` ConfigMap. When the ConfigMap is absent, the operator logs a message and falls back to built-in defaults and environment variables. Corrected the text to reflect this behavior.

## Review Notes
- The flowchart in the introduction implies a "Max Retries?" decision point leading to a permanent error state. In practice, the Rook operator uses exponential backoff and will continue retrying indefinitely. Resources may show error conditions in their status, but the operator does not permanently give up. This is a simplification, not an outright error.
- The `--server-side` flag for CRD application in Step 2 is correct and a recommended practice for large CRDs that may exceed client-side apply annotation limits.
- `ROOK_LOG_LEVEL` values `DEBUG` and `INFO` are confirmed valid (full set: ERROR, WARNING, INFO, DEBUG).
- All kubectl command syntax is correct and uses valid flags.
