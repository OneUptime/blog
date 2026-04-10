# Validation Summary: How to Use Ceph with CRI-O for Kubernetes Storage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- CRI-O (container runtime)
- Kubernetes (container orchestration)
- CSI (Container Storage Interface)
- OpenShift (Red Hat Kubernetes distribution)
- RBD (RADOS Block Device)
- CephFS (Ceph Filesystem)

## Sources Consulted
- Rook GitHub repository (`rook/rook` master branch) — verified existence of `deploy/examples/crds.yaml`, `common.yaml`, and `operator-openshift.yaml`
- Rook `common.yaml` — verified ServiceAccount names (`rook-ceph-default`, `rook-ceph-system`, etc.)
- Rook `operator-openshift.yaml` — verified SCC definitions and service account bindings
- Rook CSI source code (`pkg/operator/ceph/csi/spec.go`) — confirmed pod label values `csi-rbdplugin` and `csi-cephfsplugin`

## Issues Found

### Issue 1: Non-existent `scc.yaml` URL
- **What was wrong:** The post instructed readers to run `oc create -f https://raw.githubusercontent.com/rook/rook/master/deploy/examples/scc.yaml` as a prerequisite step. This file does not exist in the Rook repository. The Security Context Constraints are bundled inside `operator-openshift.yaml`.
- **What was changed:** Removed the `scc.yaml` command and updated the surrounding text to explain that `operator-openshift.yaml` includes the required SCCs.
- **Why:** Running this command would fail with a 404 error, blocking readers from completing the tutorial.

### Issue 2: Incorrect operator service account name
- **What was wrong:** The OpenShift Security Context section referenced `system:serviceaccount:rook-ceph:rook-ceph-operator` for the privileged SCC. The Rook operator uses the `rook-ceph-system` ServiceAccount, not `rook-ceph-operator`. No ServiceAccount named `rook-ceph-operator` is defined in Rook's manifests.
- **What was changed:** Changed `rook-ceph-operator` to `rook-ceph-system` in the `oc adm policy` command.
- **Why:** Using the wrong service account name means the SCC binding would not apply to the operator, potentially causing permission errors for Rook pods on OpenShift.

## Review Notes
- The URLs reference the `master` branch, which is confirmed as the default branch for `rook/rook`. However, for reproducible deployments, pinning to a specific release tag (e.g., `v1.15.x`) would be more robust.
- The manual `oc adm policy` commands in the "OpenShift Security Context" section are partially redundant with applying `operator-openshift.yaml`, which already defines SCCs with user bindings. The manual commands provide additional SCC bindings that may be useful if the SCC YAML doesn't cover all scenarios.
- The `rbd` kernel module loading advice is correct but may not be necessary on all distributions, as some load it automatically when CSI attempts to map an RBD device.
