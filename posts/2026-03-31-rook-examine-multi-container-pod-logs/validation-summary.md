# Validation Summary: How to Examine Multi-Container Pod Logs in Rook

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes (kubectl CLI)
- Rook-Ceph (CSI provisioner pods, OSD pods)
- Ceph Storage

## Sources Consulted
- Official kubectl logs documentation and `kubectl logs --help` output: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Official kubectl get documentation and JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Rook CSI RBD provisioner deployment template: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/template/rbd/csi-rbdplugin-provisioner-dep.yaml
- Rook OSD specification source code (spec.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/osd/spec.go
- Rook OSD management documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-osd-mgmt/

## Issues Found
No technical issues found.

## Review Notes
- All kubectl flags are correct: `-c` (container), `--all-containers`, `--prefix`, `-f` (follow), `--previous`, `--tail`, and `-l` (label selector) are all valid and used properly.
- JSONPath syntax for both simple (`{.spec.containers[*].name}`) and range-based (`{range .spec.containers[*]}{.name}{"\n"}{end}`) queries is correct.
- Rook-Ceph labels are accurate: `app=rook-ceph-osd` for OSD pods, `app=csi-rbdplugin-provisioner` for CSI RBD provisioner pods.
- The container name `osd` for the main OSD daemon container is correct per Rook source code.
- The listed CSI sidecar container names (csi-provisioner, csi-resizer, csi-attacher, csi-snapshotter, csi-rbdplugin, csi-omap-generator, liveness-prometheus) are consistent with Rook's CSI RBD provisioner deployment template.
- Combining `-l` with `-c` and `-l` with `--all-containers` are both supported kubectl usage patterns.
