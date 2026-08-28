# Validation Summary: Why a Generic Ephemeral Volume PVC Stays Pending—and How to Debug Provisioning

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes generic ephemeral volumes
- PersistentVolumeClaims and PersistentVolumes
- StorageClasses and `WaitForFirstConsumer` binding
- Kubernetes scheduler constraints and storage topology
- Container Storage Interface (CSI) drivers
- `CSIDriver`, `CSINode`, `CSIStorageCapacity`, and `VolumeAttachment` objects
- ResourceQuota and LimitRange admission policy
- Kubernetes garbage collection, finalizers, and reclaim policies
- `kubectl`, JSONPath, custom columns, and Kubernetes YAML

## Sources Consulted

- [Kubernetes generic ephemeral volume lifecycle, naming, ownership, and security](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/)
- [Kubernetes StorageClass defaults, binding modes, topology, and reclaim policy](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes storage capacity tracking, scheduling, and retry behavior](https://kubernetes.io/docs/concepts/storage/storage-capacity/)
- [Kubernetes `CSIStorageCapacity` API reference](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-storage-capacity-v1/)
- [Kubernetes `CSIDriver` API reference](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-driver-v1/)
- [Kubernetes `CSINode` API reference](https://kubernetes.io/docs/reference/kubernetes-api/storage/csi-node-v1/)
- [Kubernetes `VolumeAttachment` API reference](https://kubernetes.io/docs/reference/kubernetes-api/storage/volume-attachment-v1/)
- [Kubernetes Event API and best-effort semantics](https://kubernetes.io/docs/reference/kubernetes-api/events/)
- [Kubernetes Event API migration guidance](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#event)
- [Kubernetes admission controllers](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [Kubernetes object metadata update validation](https://github.com/kubernetes/apimachinery/blob/master/pkg/api/validation/objectmeta.go)
- [Kubernetes storage resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/#storage-resource-quota)
- [Kubernetes LimitRange controls for PVC storage requests](https://kubernetes.io/docs/tasks/administer-cluster/limit-storage-consumption/)
- [Kubernetes PersistentVolume reclaiming and deletion finalizers](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes kubectl quick reference for sorting Events](https://kubernetes.io/docs/reference/kubectl/quick-reference/#viewing-finding-resources)
- [Kubernetes kubectl watch implementation](https://github.com/kubernetes/kubectl/blob/master/pkg/cmd/get/get.go)
- [Kubernetes generic ephemeral volume controller implementation](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/volume/ephemeral/controller.go)
- [Kubernetes generic ephemeral PVC naming and ownership helper](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/component-helpers/storage/ephemeral/ephemeral.go)

## Issues Found

- The introduction and conclusion treated Events as the boundary between an expected and faulty `Pending` state and implied that Events always identify the exact blocker. Kubernetes Events are best-effort and have limited retention, so the text now states that lack of progress is the fault condition and Events usually help identify it.
- The missing-PVC flow said the Pod may have failed admission after directing readers to describe that Pod. A rejected Pod creation does not persist a Pod object. The flow now directs readers to the create/apply error when the Pod is absent and distinguishes that from admission rejection of the generated PVC when the Pod exists.
- The ownership check compared the Pod UID with any PVC owner reference. Kubernetes requires the Pod to be the controlling owner, so the check now specifies the owner-reference entry with `controller: true`.
- The collision advice suggested renaming an existing Kubernetes object in place. Object names are immutable, so it now says to delete the unrelated PVC safely and recreate it under another name if needed, or recreate the Pod with a non-conflicting naming scheme.
- The StorageClass discussion implied that omitting `storageClassName` always selects a class. It now explains that a default is used only when one exists and that an omitted field otherwise remains unset until a default becomes available.
- One Event command sorted on legacy `.lastTimestamp`. It now uses `.metadata.creationTimestamp`, matching the current kubectl quick reference and avoiding deprecated Event timestamp data.
- The CSI inspection wording assumed every relevant provisioner was CSI-backed and conflated `CSINode` topology keys with their values. It now scopes the checks to CSI-backed classes, matches `CSIDriver.metadata.name` to the StorageClass provisioner, checks `CSINode` driver entries and `topologyKeys`, and checks the corresponding values on Node labels. YAML output was added so the commands expose the fields being discussed.
- The mount-readiness bullet implied that attach, stage, format, and mount always occur and that all failures appear as Pod or Node events. It now marks the steps as applicable and includes `VolumeAttachment` status and kubelet or CSI node-plugin logs as relevant evidence.
- The quota section suggested an admission-rejected generated PVC could carry an Event. A rejected create leaves no PVC object; the text now points to the `FailedBinding` warning emitted on the owning Pod by the ephemeral volume controller.
- `kubectl get pvc,pv --watch` was invalid because kubectl watch accepts only one resource type, and it omitted `-n data` for the PVC. It was replaced with separate namespaced PVC and cluster-scoped PV watches that start before Pod deletion.
- The cleanup command could not observe the external backing volume, and the final paragraph incorrectly grouped intentional `Retain` behavior with stuck-finalizer recovery. The post now requires driver/provider tooling for backend verification, treats stuck finalizers diagnostically, and explains that `Retain` leaves the PV and storage asset for manual reclamation.

## Review Notes

- The YAML is intentionally a Pod fragment rather than a standalone manifest; its field names, nesting, access mode, and resource quantity are current and valid.
- The remaining shell and kubectl examples use valid syntax. The CSI driver's supported access modes, volume modes, capacity tracking, topology behavior, logging locations, and backend cleanup remain driver-specific.
- All links in the post's Official Documentation section resolve to the intended current Kubernetes documentation pages.
