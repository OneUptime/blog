# Validation Summary: How to Set Up Red Hat Ceph Storage for OpenShift Container Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Ceph Storage (RHCS)
- OpenShift Container Storage (OCS) / OpenShift Data Foundation (ODF)
- Rook-Ceph
- OpenShift Container Platform (OCP)
- Kubernetes Persistent Volumes
- Operator Lifecycle Manager (OLM)

## Sources Consulted
- Red Hat OpenShift Data Foundation documentation: https://docs.redhat.com/en/documentation/red_hat_openshift_data_foundation/
- Red Hat OCS 4.x StorageCluster CRD reference
- OpenShift OLM Subscription API reference: https://docs.openshift.com/container-platform/4.15/operators/understanding/olm/olm-understanding-olm.html
- Rook-Ceph documentation: https://rook.io/docs/rook/latest/

## Issues Found
1. **Misplaced `resources` block in StorageCluster YAML**: The `storageDeviceSets[].resources` field had `requests.storage: 500Gi`, which is incorrect. The `resources` field at the deviceSet level is for OSD pod CPU/memory resource requests/limits, not for storage capacity. The storage size was already correctly specified in `dataPVCTemplate.spec.resources.requests.storage`. Removed the misplaced `resources` block to avoid confusion or validation errors.

## Review Notes
- The post references `ocs-operator` with channel `stable-4.15`. Starting with OpenShift 4.9, OCS was rebranded to OpenShift Data Foundation (ODF), and the recommended operator name changed to `odf-operator`. Users targeting OCP 4.9+ should subscribe to `odf-operator` instead. The post does mention the rename in the introduction, but the code examples still use the old operator name.
- The post does not mention creating the `openshift-storage` namespace before applying the Subscription. In practice, users need to create this namespace (and an OperatorGroup) first, or use the OpenShift web console which handles this automatically. This is an omission but is common in guides that assume some OCP operator management familiarity.
- The node label `cluster.ocs.openshift.io/openshift-storage=""` is correct for OCS/ODF internal mode deployments.
- The expected StorageClass names (`ocs-storagecluster-ceph-rbd`, `ocs-storagecluster-cephfs`, `openshift-storage.noobaa.io`) are accurate for OCS/ODF internal mode.
