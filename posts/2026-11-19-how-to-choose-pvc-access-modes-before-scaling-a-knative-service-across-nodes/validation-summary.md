# Validation Summary: How to Choose PVC Access Modes Before Scaling a Knative Service Across Nodes

## Status
validated

## Post Type
Technical guide with a Kubernetes PVC manifest and diagnostic CLI commands.

## Technologies Covered
- Knative Serving, Revisions, traffic migration, and autoscaling
- Kubernetes PersistentVolumes, PersistentVolumeClaims, and access modes
- StorageClasses, CSI drivers, and volume topology
- kubectl and YAML

## Sources Consulted
- Kubernetes Persistent Volumes: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- Kubernetes Storage Classes: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Knative Volume Support: https://knative.dev/docs/serving/services/storage/
- Knative Traffic Management: https://knative.dev/docs/serving/traffic-management/
- Knative Configuring Scale Bounds: https://knative.dev/docs/serving/autoscaling/scale-bounds/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Knative service-label usage: https://knative.dev/docs/eventing/flows/sequence/sequence-with-broker-trigger/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The storage-guide sentence implied that both the PVC and write extensions are required for every claim reference. Clarified that the PVC extension permits the reference, while the additional write extension is required for writable access. Knative documents these as separate controls; read-only use does not require write access.

## Review Notes
- Confirmed the distinction between node-scoped RWO and cluster-wide single-pod RWOP, driver-dependent mode support, and the warning that access modes do not provide general filesystem write protection.
- RWOP requires CSI support and compatible sidecars; Kubernetes documents it as stable since 1.29. The post does not claim support for a particular historical release.
- Confirmed that traffic can reach multiple Revisions and that max-scale applies per Revision, so a value of one does not establish exclusive use of a shared claim across the Service.
- Reviewed the PVC YAML against documented fields: core v1, PersistentVolumeClaim, namespace, storageClassName, accessModes, and the 10Gi storage request are valid. The example requires the applications namespace and compatible storage; shared-filesystem is explicitly a placeholder class name.
- Confirmed that provisioning topology and WaitForFirstConsumer affect volume placement and binding, without adding storage access capabilities. Migration to compatible storage is sound advice.
- Verified kubectl namespace selection, PVC lookup, label filtering, YAML and wide output, and single-pod describe syntax. Wide output provides node placement, and describing a single pod includes related events by default. The example pod name must be replaced as instructed.
- Checked the linked documentation and author profile destinations. No deprecated API or CLI syntax was identified in the examples.
- Concurrent-write coordination and data-integrity testing remain necessary even with multi-node writable storage. External database or object-store suitability depends on application semantics, as the post acknowledges.
- This was a documentation-based review. No live cluster, provisioner, attachment failover, or application data-integrity test was run; those results depend on the target environment.
