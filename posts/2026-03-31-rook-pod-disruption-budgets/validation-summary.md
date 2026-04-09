# Validation Summary: How to Manage Pod Disruption Budgets in Rook-Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes Pod Disruption Budgets (policy/v1)
- kubectl CLI

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook ceph-cluster Helm chart values.yaml: https://github.com/rook/rook/blob/master/deploy/charts/rook-ceph-cluster/values.yaml
- Rook Managed Disruption Budgets design doc: https://github.com/rook/rook/blob/master/design/ceph/ceph-managed-disruptionbudgets.md
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes policy/v1 API: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/

## Issues Found
1. **Incorrect configuration mechanism for OSD disruption management.** The post claimed that OSD disruption management is controlled by a `managedDisruptionBudgets` flag in the operator ConfigMap (`rook-ceph-operator-config`) using the key `ROOK_OSD_DISRUPTION_MANAGEMENT`. This is incorrect on multiple counts:
   - `ROOK_OSD_DISRUPTION_MANAGEMENT` is not a real operator ConfigMap key.
   - The feature name referenced as `managedDisruptionBudgets` does not match any actual Rook configuration field.
   - The correct configuration is through the CephCluster custom resource under `spec.disruptionManagement.managePodBudgets: true`.
   - **Fix applied:** Replaced the operator ConfigMap YAML with a CephCluster CR snippet using the correct `spec.disruptionManagement` section, and updated the prose to reference `managePodBudgets` as the correct field name.

## Review Notes
- The sample `kubectl get poddisruptionbudget` output uses illustrative PDB names that may not exactly match what a real Rook deployment produces (e.g., `rook-ceph-osd-tree-mon-a` is not a typical Rook PDB name), but this is acceptable as sample output.
- The manual PDB example uses `apiVersion: policy/v1` which is correct for Kubernetes 1.21+. Users on older Kubernetes versions would need `policy/v1beta1`, but this is unlikely to be relevant going forward.
- The `managePodBudgets` field defaults to `true` in the Rook Helm chart, so many users may already have this enabled without explicit configuration.
