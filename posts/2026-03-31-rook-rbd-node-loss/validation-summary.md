# Validation Summary: How to Handle Node Loss for RBD Volumes in Rook

## Status
validated

## Post Type
Guide / Operational Runbook

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- Kubernetes (Pods, PVCs, PVs, VolumeAttachments, Node management)
- Kubernetes CSI (Container Storage Interface) for RBD
- Node Problem Detector
- kubectl CLI

## Sources Consulted
- Kubernetes JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes GitHub issue on JSONPath negative indices: https://github.com/kubernetes/kubernetes/issues/69146
- Ceph RBD CLI documentation (rbd lock list, rbd lock remove, rbd status)
- Ceph OSD blocklist documentation (ceph osd blocklist add/ls)
- Kubernetes Node Problem Detector releases: https://github.com/kubernetes/node-problem-detector/releases
- Kubernetes taint and toleration documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Rook CSI RBD plugin documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/block-storage/
- Kubernetes VolumeAttachment API reference

## Issues Found

### 1. Invalid kubectl JSONPath negative array index
- **What was wrong:** The command `kubectl get node <failed-node-name> -o jsonpath='{.status.conditions[-1].type}'` used a negative array index (`[-1]`) which is not supported for direct element access in Kubernetes kubectl JSONPath. Additionally, retrieving the condition "type" is less useful than retrieving the "status" of the Ready condition.
- **What was changed:** Replaced with `kubectl get node <failed-node-name> -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'` which uses a supported filter expression and returns "True", "False", or "Unknown" for the Ready condition -- directly answering whether the node is reachable.
- **Why:** Kubernetes JSONPath only supports negative indices in slice notation (e.g., `[-1:]`), not for single element access. The filter-based approach is both correct and more semantically useful.

### 2. Outdated Node Problem Detector image version
- **What was wrong:** The DaemonSet referenced `node-problem-detector:v0.8.14`, which is a significantly outdated release.
- **What was changed:** Updated to `node-problem-detector:v0.8.25`, a current stable release in the v0.8.x series.
- **Why:** v0.8.14 is multiple major patches behind and readers following the guide would pull an unnecessarily old version with known issues fixed in later releases.

## Review Notes
- The Node Problem Detector DaemonSet example is minimal and lacks volume mounts for `/var/log` and kernel monitor configuration that would be needed for a production deployment. This is acceptable since the blog focuses on RBD node loss recovery, not NPD setup, but readers should consult the NPD documentation for a complete configuration.
- All `rbd` commands (lock list, lock remove, status) use correct syntax and argument ordering.
- The `ceph osd blocklist` commands use the current terminology (not the deprecated "blacklist" from pre-Pacific Ceph).
- The `ceph osd purge` command with `--yes-i-really-mean-it` flag is correct.
- The VolumeAttachment JSONPath filter query for finding attachments by PV name is correct.
- The toleration keys (`node.kubernetes.io/not-ready` and `node.kubernetes.io/unreachable`) and the default 300-second (5 minute) eviction timeout are accurate.
