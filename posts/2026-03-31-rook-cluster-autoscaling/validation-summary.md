# Validation Summary: How to Configure Rook-Ceph Cluster Autoscaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephCluster CRD, OSD provisioning, PG autoscaler)
- Kubernetes (Cluster Autoscaler, CronJobs, node labeling, PVCs)
- Ceph (BlueStore, OSD management, placement groups, `ceph df`, `ceph osd tree`)
- AWS EKS (launch templates, Auto Scaling Groups)

## Sources Consulted
- Rook v1.13 CephCluster CRD source: https://github.com/rook/rook/blob/release-1.13/pkg/apis/ceph.rook.io/v1/types.go — verified `StorageClassDeviceSet` field names (`tuneDeviceClass` vs `tuneSlowDeviceClass`, `portable`, `tuneFastDeviceClass`)
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/ — verified `useAllNodes`, `useAllDevices`, `deviceFilter`, `storageClassDeviceSets`, and placement configuration
- Kubernetes Cluster Autoscaler FAQ and documentation: https://github.com/kubernetes/autoscaler/tree/master/cluster-autoscaler — verified that `NodeTemplate` CRD does not exist; confirmed ASG tag-based label propagation
- bitnami/kubectl Docker Hub page: https://hub.docker.com/r/bitnami/kubectl/ — confirmed python3 is not included; jq is available
- Ceph documentation for `ceph df` JSON output format — verified `stats.total_bytes` and `stats.total_used_raw_bytes` field names

## Issues Found

1. **Removed `config.storeType: bluestore` from CephCluster spec** (line 45-46). The `storeType` key under `spec.storage.config` is not a valid user-facing configuration field in modern Rook. BlueStore is the only supported OSD backend, and the correct field path (if needed) would be `spec.storage.store.type`. Since BlueStore is the default, the config section was removed entirely.

2. **Replaced fabricated `NodeTemplate` CRD** (lines 74-88). The post contained a YAML manifest using `apiVersion: autoscaling/v1beta1` and `kind: NodeTemplate`, which is not a real Kubernetes API resource or Cluster Autoscaler CRD. Replaced with the correct approach: using the kubelet `--node-labels` flag in EKS bootstrap user-data and the `k8s.io/cluster-autoscaler/node-template/label/` ASG tag for Cluster Autoscaler awareness.

3. **Fixed CronJob JSON parsing from `python3` to `jq`** (lines 153-161). The `bitnami/kubectl:latest` image does not include `python3`. The JSON parsing was rewritten to use `jq`, which is included in the bitnami/kubectl image. The `ceph df` JSON output fields (`stats.total_bytes`, `stats.total_used_raw_bytes`) remain correct.

4. **Fixed `tuneSlowDeviceClass` to `tuneDeviceClass`** (line 106). The Go struct field `TuneSlowDeviceClass` serializes to JSON/YAML as `tuneDeviceClass` (not `tuneSlowDeviceClass`), per the `json:"tuneDeviceClass,omitempty"` struct tag in the Rook CRD types.

## Review Notes
- The `storageClassName: local-storage` in the PVC-based OSD example is valid but may be confusing in context. The post says "for cloud environments where raw disk is not available" but `local-storage` typically refers to local disks. Readers using cloud block storage (EBS, Persistent Disk) should substitute their cloud StorageClass (e.g., `gp3`, `pd-ssd`).
- The node labeling example is now EKS-specific. Users on GKE, AKS, or bare-metal clusters will need to adapt the approach to their platform's node labeling mechanism.
- The PG autoscaler (`pg_autoscaler`) is enabled by default since Ceph Nautilus (v14.2.x). The `ceph mgr module enable pg_autoscaler` command is only needed for older clusters but is harmless on newer ones.
- The CronJob uses `serviceAccountName: rook-ceph-operator` which grants broad permissions. In production, a dedicated ServiceAccount with minimal RBAC (only exec into the tools pod) would be more appropriate.
