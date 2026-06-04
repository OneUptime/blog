# Validation Summary: How to Configure Generic Ephemeral Volumes for Temporary Scratch Space

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes generic ephemeral volumes
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes ResourceQuota
- Kubernetes StatefulSets and Jobs
- kubectl
- AWS EBS CSI driver StorageClass parameters
- jq

## Sources Consulted
- Kubernetes documentation: Ephemeral Volumes - https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/
- Kubernetes API reference: Pod v1 EphemeralVolumeSource - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Resource Quotas - https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Amazon EKS documentation: Create a storage class / EBS CSI StorageClass parameters - https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html

## Issues Found
- The description claimed generic ephemeral volumes provide better performance than emptyDir. Changed it to say they provide more storage features than emptyDir, because emptyDir is local kubelet-managed storage and is often faster for scratch data.
- The lifecycle wording said volumes are deleted when a pod terminates. Changed it to deletion when the Pod object is deleted, matching Kubernetes generic ephemeral volume ownership and garbage collection behavior.
- The post described generic ephemeral volumes as backed only by PersistentVolumes. Updated this to mention both PersistentVolumes and PersistentVolumeClaims, because Kubernetes creates a PVC from the inline volume claim template.
- The PVC name example used a random suffix. Changed it to `data-processor-scratch`, because Kubernetes names generic ephemeral PVCs as `<pod-name>-<volume-name>`.
- The data processing Job used an ffmpeg Alpine image but then ran `aws s3 cp`; added installation of `aws-cli` and `wget` before use so the command is internally consistent.
- The Postgres StatefulSet example omitted `POSTGRES_PASSWORD`, which prevents the official Postgres image from starting normally. Added a sample password environment variable.
- The ResourceQuota example used `requests.ephemeral-storage` with `persistentvolumeclaims` and a PriorityClass scope. Changed it to use PVC-backed storage quota fields, `requests.storage` and `persistentvolumeclaims`, and removed the invalid scope for PVC resources.
- The monitoring example attempted to sum PVC capacities by stripping units, which gives incorrect totals across Kubernetes quantity suffixes. Replaced it with `kubectl describe resourcequota` for quota usage.
- The orphaned PVC cleanup command attempted to perform shell checks inside jq and would not correctly find missing owner pods. Replaced it with a jq-plus-shell loop that checks each owning Pod through `kubectl`.
- Namespace flags were missing from PVC delete and patch cleanup commands even though the monitoring command lists PVCs across namespaces. Added `-n <namespace>`.

## Review Notes
- kubectl was not installed in the local environment, so CLI verification was performed against the official kubectl reference rather than local `kubectl --help` output.
- Generic ephemeral volume cleanup depends on the Pod object being deleted. Completed Job Pods can keep their PVCs until the Pod is removed, for example by Job TTL cleanup or manual deletion.
- A StorageClass with a Retain reclaim policy can leave the underlying storage behind after PVC deletion, so retained storage may need separate cleanup.
