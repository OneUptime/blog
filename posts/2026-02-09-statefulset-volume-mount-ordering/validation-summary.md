# Validation Summary: How to Troubleshoot K8s StatefulSet Pod Not Starting Due to Volume Mount

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Kubernetes StatefulSets
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes init containers
- Kubernetes volume mounts and subPath
- AWS EBS CSI storage provisioning
- kubectl

## Sources Consulted
- Kubernetes StatefulSets documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes StatefulSet API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Amazon EKS EBS CSI driver documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html

## Issues Found
- The post framed the problem as "volume mount ordering" and implied kubelet mount order differences were the common root cause. Kubernetes prepares pod volumes before containers start; the more accurate causes are provisioning, attachment, mount path, subPath, filesystem, and permission issues. Updated the description, introduction, common-problems explanation, and conclusion to use that framing.
- The StatefulSet volume management section said volumes are created when pods are scheduled. Updated it to describe the StatefulSet controller mapping pod identities to PVCs and volumes being mounted before containers start.
- The diagnostic PVC command used `kubectl get pvc -l app=database`, but PVCs created from a `volumeClaimTemplate` are not guaranteed to have the pod template's `app` label. Changed it to `kubectl get pvc`.
- The init-container example said the init container hangs while waiting for PVC provisioning. Kubernetes does not start init containers until required volumes are available. Updated the text to say the pod remains Pending or ContainerCreating while waiting for the volume.
- The StorageClass example used the removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Updated it to the current AWS EBS CSI provisioner `ebs.csi.aws.com`.
- The slow-provisioning section implied StatefulSet pod timeouts and `terminationGracePeriodSeconds` account for volume attachment delays. Updated the guidance so startup probes cover application startup after storage is mounted, while PVC binding and attachment are monitored separately; clarified `terminationGracePeriodSeconds` as clean-shutdown time.
- The overlapping mount-path section included an inaccurate mount-order explanation. Updated it to match Kubernetes volume documentation: volumes should not be mounted inside other volumes, and nested mounts can hide content if accepted by a runtime.
- The subPath section said the main container might fail simply because Kubernetes expects the subPath directory to exist. Updated it to focus on real initialization concerns: ownership, permissions, and expected content.
- The best-practices section said to always use init containers. Updated it to recommend init containers when the application requires specific permissions, ownership, or subdirectories.

## Review Notes
- All fenced YAML snippets were parsed successfully with PyYAML.
- `kubectl` was not installed in the local environment, so command validation was performed against the official Kubernetes kubectl reference rather than local `kubectl --help` output.
