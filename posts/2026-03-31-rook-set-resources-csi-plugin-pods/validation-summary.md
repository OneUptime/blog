# Validation Summary: How to Set Resources for Rook CSI Plugin Pods

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph CSI drivers (RBD and CephFS)
- Kubernetes DaemonSets and resource management
- Container resource requests and limits

## Sources Consulted
- Rook CephCluster CRD Go type definitions: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go — confirmed `CSIDriverSpec` does NOT include plugin resource fields
- Rook operator Helm chart values: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph/values.yaml — confirmed `csiRBDPluginResource` and `csiCephFSPluginResource` are operator-level Helm values using multiline string format
- Rook CSI spec source code: https://github.com/rook/rook/blob/master/pkg/operator/ceph/csi/spec.go — confirmed ConfigMap keys are `CSI_RBD_PLUGIN_RESOURCE` and `CSI_CEPHFS_PLUGIN_RESOURCE`
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook example cluster.yaml: https://github.com/rook/rook/blob/master/deploy/examples/cluster.yaml

## Issues Found

### 1. Incorrect configuration location (CephCluster CR vs. operator ConfigMap)
- **What was wrong:** The post showed `csiRBDPluginResource` and `csiCephFSPluginResource` as fields under `spec.csi` in a CephCluster CR (`apiVersion: ceph.rook.io/v1, kind: CephCluster`). These fields do not exist in the CephCluster CRD. They are operator-level settings.
- **What was changed:** Replaced the CephCluster CR example with a `rook-ceph-operator-config` ConfigMap example using the correct keys (`CSI_RBD_PLUGIN_RESOURCE` and `CSI_CEPHFS_PLUGIN_RESOURCE`). Added a note about the Helm chart alternative (`csi.csiRBDPluginResource` and `csi.csiCephFSPluginResource` in the rook-ceph operator chart values).

### 2. CPU limits in default resource examples
- **What was wrong:** The post set CPU limits (e.g., `cpu: 100m`, `cpu: 500m`) on all containers. The official Rook defaults do not set CPU limits, only CPU requests and memory limits. While setting CPU limits is valid, including them in the example could be misleading as "default" configuration.
- **What was changed:** Removed CPU limits from the example to match the official Rook default values, keeping only CPU requests and memory limits.

### 3. Apply command referenced wrong file
- **What was wrong:** The apply command referenced `cephcluster.yaml` but the configuration is now a ConfigMap.
- **What was changed:** Updated to `operator-configmap.yaml`.

### 4. Summary text referenced wrong configuration method
- **What was wrong:** Summary mentioned "CephCluster `csi.*PluginResource` fields."
- **What was changed:** Updated to reference the `rook-ceph-operator-config` ConfigMap keys and Helm chart values.

### 5. Comment referenced CephCluster spec
- **What was wrong:** An inline comment said "update resources via CephCluster spec and re-apply."
- **What was changed:** Updated to "update resources via operator ConfigMap and re-apply."

## Review Notes
- The container names (`csi-rbdplugin`, `csi-cephfsplugin`, `driver-registrar`, `liveness-prometheus`) are correct per the Rook source code.
- The DaemonSet names and pod labels (`app=csi-rbdplugin`, `app=csi-cephfsplugin`) are correct.
- The kubectl monitoring and troubleshooting commands are all syntactically correct and appropriate.
- The sizing guide table provides reasonable recommendations, though actual requirements will vary by workload.
- The multiline YAML string format (`|`) is correct — Rook parses these as YAML strings internally.
