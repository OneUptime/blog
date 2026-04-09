# Validation Summary: How to Fix OSD Pods Not Starting in Rook

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (OSD / Object Storage Daemon)
- Kubernetes (pods, jobs, init containers, tolerations, node debugging)

## Sources Consulted
- Rook source code: `pkg/operator/ceph/cluster/osd/spec.go` (OSD init container definitions) — https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/spec.go
- Rook source code: `pkg/operator/ceph/cluster/osd/provision_spec.go` (OSD prepare Job definition, `provision` container name) — https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/provision_spec.go
- Rook source code: `pkg/operator/ceph/cluster/osd/osd.go` (AppName constants, label selectors) — https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/osd.go
- Rook source code: `pkg/operator/ceph/controller/spec.go` (`chown-container-data-dir` init container) — https://github.com/rook/rook/blob/master/pkg/operator/ceph/controller/spec.go
- Rook design document: dedicated OSD pod design — https://github.com/rook/rook/blob/master/design/ceph/dedicated-osd-pod.md
- Rook troubleshooting documentation — https://github.com/rook/rook/blob/master/Documentation/Troubleshooting/ceph-common-issues.md

## Issues Found

### Issue 1: Incorrect claim that OSD prepare runs as init container
- **What was wrong:** The text stated "OSD prepare runs as init container." OSD prepare actually runs as a separate Kubernetes batch Job (`rook-ceph-osd-prepare-<node>`), not as an init container of the OSD pod. The OSD pod's init containers handle activation, not preparation.
- **What was changed:** Changed the comment to "OSD activation runs as an init container."

### Issue 2: Incorrect init container names
- **What was wrong:** The post used `osd-init` and `activation` as init container names. Neither of these exist in any Rook version. The actual init container names (from Rook source code) are `activate`, `expand-bluefs`, `chown-container-data-dir`, `config-init`, and `copy-bins`.
- **What was changed:** Replaced `osd-init` with `activate` and `activation` with `chown-container-data-dir`.

### Issue 3: Incorrect container name for OSD prepare Job
- **What was wrong:** The command `kubectl logs -n rook-ceph job/<osd-prepare-job> -c osd` used `-c osd` as the container name. The container in the OSD prepare Job is named `provision`, not `osd`. (The `osd` container name is for the main OSD daemon pod, not the prepare Job.)
- **What was changed:** Changed `-c osd` to `-c provision`.

## Review Notes
- The OSD pod has several other init containers beyond the two shown (`expand-bluefs`, `config-init`, `copy-bins`, plus encryption-related containers when encryption is enabled). Users may need to check `kubectl describe pod` to identify the specific init container that is failing.
- All other commands (`kubectl get pods`, `kubectl describe`, `kubectl debug node`, `ceph osd out/down`, `ceph health detail`, `ceph osd status`) and the label selector `app=rook-ceph-osd` are correct.
- The CephCluster CRD placement/tolerations YAML structure is correct.
- The overall troubleshooting methodology (check pod status, read logs, inspect node-level devices, verify permissions, check prepare jobs) is sound and follows Rook best practices.
