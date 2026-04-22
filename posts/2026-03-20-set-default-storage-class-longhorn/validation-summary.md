# Validation Summary: How to Set Default Storage Class to Longhorn

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes StorageClass
- Kubernetes PersistentVolumeClaim
- kubectl
- Longhorn
- Helm

## Sources Consulted
- Kubernetes documentation: Change the default StorageClass - https://kubernetes.io/docs/tasks/administer-cluster/change-default-storage-class/
- Kubernetes documentation: Storage Classes - https://kubernetes.io/docs/concepts/storage/storage-classes/
- Longhorn documentation: Helm Values - https://longhorn.io/docs/1.11.1/references/helm-values/
- Longhorn documentation: Storage Class Parameters - https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn documentation: Settings - https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn documentation: Create Longhorn Volumes - https://longhorn.io/docs/1.11.1/nodes-and-volumes/volumes/create-volumes/

## Issues Found
- The post claimed Kubernetes rejects PVC creation when multiple StorageClasses are marked as default. Kubernetes documentation states that PVCs without `storageClassName` use the most recently created default StorageClass. Updated the explanation to match Kubernetes behavior.
- The post described changing **Default Longhorn Static StorageClass Name** in the Longhorn UI as a way to make Longhorn the default Kubernetes StorageClass. Longhorn documentation says that setting is for PV/PVC creation for existing Longhorn volumes, not for default dynamic provisioning. Replaced the steps with a clarification that users should use the Kubernetes annotation or Helm `persistence.defaultClass`.
- The post described setting the annotation to `"false"` as removing the annotation. Kubernetes documentation treats any value other than `"true"` as non-default, so the command is valid, but the wording was updated to "mark as non-default" for technical precision.

## Review Notes
The kubectl patch commands and Longhorn Helm values shown in the post match the official Kubernetes and Longhorn documentation. The local environment did not have `kubectl` installed, so CLI behavior was validated against official documentation rather than local command execution.
