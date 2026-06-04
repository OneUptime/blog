# Validation Summary: How to Handle Orphaned Persistent Volumes After Namespace Deletion

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses and reclaim policies
- Kubernetes admission webhooks
- kubectl
- AWS EBS and AWS CLI
- Bash, jq, and Prometheus/PromQL
- kube-state-metrics

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes Field Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Amazon EKS EBS CSI documentation: https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- AWS CLI create-snapshot reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- AWS CLI wait snapshot-completed reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/snapshot-completed.html
- AWS CLI delete-volume reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/delete-volume.html
- kube-state-metrics PersistentVolume metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/persistentvolume-metrics.md

## Issues Found
- The opening explanation implied PersistentVolumes are namespace-scoped resources. Updated it to clarify that namespace deletion removes namespaced resources such as PVCs, while PVs are cluster-scoped and may remain.
- The first StorageClass used the deprecated in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Updated it to the current EBS CSI provisioner `ebs.csi.aws.com`, consistent with the later examples.
- The post said three reclaim policies "exist" and described Recycle as no longer supported. Adjusted the wording to say the policies are defined and that Recycle is deprecated and should not be used.
- The `kubectl get pv --field-selector status.phase=Released` example relied on a field selector that is not listed as supported for PersistentVolumes. Replaced it with JSON output filtered through `jq`.
- The EBS snapshot recovery example waited on `$SNAPSHOT_ID` without assigning it. Updated the command to capture the snapshot ID from `aws ec2 create-snapshot`.
- The PV patch command was shown in a YAML code block and omitted the patch type. Changed the block to Bash and added `--type=merge`.
- The recovery pod `kubectl run --overrides` example omitted `apiVersion` in the override object. Added `apiVersion: v1`.
- The cleanup script aged Released PVs using PV creation time rather than phase transition time. Updated it to use `.status.lastPhaseTransitionTime` when available, with creation time as a fallback.
- The cleanup script assumed every Released PV had a CSI volume handle. Added a guard to skip non-CSI PVs.
- The cleanup script created a snapshot but did not wait for completion before deleting retained storage. Added `aws ec2 wait snapshot-completed`.
- The cleanup script comment incorrectly said deleting the PV would trigger volume deletion if the reclaim policy allowed it, even though the workflow targets retained volumes. Reworded the comment to match the explicit EBS deletion step.
- The namespace finalizer section recommended adding `kubernetes.io/pvc-protection` to a Namespace, which is misleading and could leave deletion blocked without a controller to remove the finalizer. Reworked the section to use namespace annotations plus admission control.
- The Go admission webhook snippet imported `net/http` without using it. Removed the unused import.
- The Go admission webhook returned warning text through `Result.Message` on an allowed response. Updated it to use the AdmissionResponse `Warnings` field.
- The cost calculation script used a pipeline into `while`, so `total_gb` would be updated in a subshell and remain zero in the parent shell. Replaced it with process substitution.
- The cost script used the unsupported PersistentVolume field selector. Replaced it with `jq` filtering on `.status.phase`.
- The PromQL query filtered `kube_persistentvolume_capacity_bytes` by `phase`, but that metric does not have a `phase` label. Updated the query to join capacity with `kube_persistentvolume_status_phase{phase="Released"}` on `persistentvolume`.

## Review Notes
The scripts are AWS EBS CSI oriented because they use `.spec.csi.volumeHandle` and AWS CLI EBS commands. They are technically valid for that context, but future improvements could make the scripts provider-agnostic or handle non-Gi capacity units more comprehensively.
