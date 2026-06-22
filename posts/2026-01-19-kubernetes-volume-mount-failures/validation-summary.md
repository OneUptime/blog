# Validation Summary: How to Debug Kubernetes Volume Mount Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes Pods
- PersistentVolumes and PersistentVolumeClaims
- StorageClasses
- CSI drivers
- ConfigMap and Secret volumes
- Pod security contexts
- kubectl

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Pod security context task: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes PersistentVolume API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/

## Issues Found
- The StorageClass example used the deprecated and removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Changed it to the current AWS EBS CSI provisioner `ebs.csi.aws.com`.
- The access mode explanation described `ReadWriteOnce` as a single-pod mode. Updated the wording to clarify that RWO is single-node read-write, while RWX/ROX are many-node modes.
- The access mode conflict diagnosis implied a pod directly requests RWX. Updated it to describe PVC-to-PV access mode matching.
- The multi-attach diagnosis and summary were tightened to describe RWO attachment across multiple nodes rather than multiple pods in general.
- The diagnostic flow suggested updating a PVC access mode for read-only errors. Updated it to point at pod/PV read-only settings instead.
- The read-only diagnosis mentioned a `readOnly` setting in `claimRef`, but `claimRef` only records PV/PVC binding. Updated the note to check the pod volume source or PV/CSI source.
- The `subPathExpr` example used `$(POD_NAME)` without noting that it must be defined as an environment variable. Added that caveat.
- The debug `kubectl run` command passed `-- sh` while the override already set `command: ["sh"]`, which would add an unnecessary shell argument. Removed the trailing command argument.

## Review Notes
The CSI controller and node component names in the examples are intentionally generic; real deployments may use provider-specific Deployment, DaemonSet, label, and namespace names. `kubectl` was not installed in the local environment, so command validation was performed against the official Kubernetes command reference rather than local `kubectl --help` output.
