# Validation Summary: Diagnose EKS EFS Provisioning: StorageClasses, Access Points, and POSIX IDs

## Status
validated

## Post Type
Technical troubleshooting guide with Kubernetes commands, a StorageClass manifest, and an AWS CLI query.

## Technologies Covered
- Amazon EKS and EC2 worker nodes
- Amazon EFS and EFS access points
- AWS EFS CSI driver and CSI external provisioner
- Kubernetes StorageClasses, persistent volumes, persistent volume claims, and kubectl
- AWS IAM, EKS Pod Identity, IRSA, and AWS CLI
- NFS and POSIX user/group identities and directory permissions

## Sources Consulted
- [EFS CSI driver overview](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/README.md): access-point provisioning and capacity semantics.
- [EFS CSI dynamic provisioning parameters](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/master/docs/parameters.md): parameter names, GID ranges, directory paths, and identity configuration.
- [Amazon EKS EFS CSI documentation](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html): Fargate limitations and controller IAM setup with Pod Identity or IRSA.
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/): API version, default-class selection, reclaim policy, and binding mode.
- [Kubernetes persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/): claims, class selection, and volume lifecycle.
- [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), and [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/): resource syntax, namespace selection, YAML output, container selection, deployment logs, and relative time filtering.
- [Upstream controller deployment manifest](https://raw.githubusercontent.com/kubernetes-sigs/aws-efs-csi-driver/master/deploy/kubernetes/base/controller-deployment.yaml): controller and container names.
- [AWS CLI describe-access-points](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-access-points.html): filesystem filter, query option, and response field names.
- [AmazonEFSCSIDriverPolicy](https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonEFSCSIDriverPolicy.html): management API permissions and tag conditions.
- [EFS access-point identity enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html): server-side identity replacement and new-file ownership.
- [EFS access-point root directories](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html): directory creation and preservation of existing permissions.
- [EFS mount troubleshooting](https://docs.aws.amazon.com/efs/latest/ug/troubleshooting-efs-mounting.html): DNS, network, mount-target, and access-denial failures.

## Issues Found
- The default StorageClass guidance did not distinguish an omitted `storageClassName` from an explicitly empty string. Updated it to explain that omission permits default selection, while `storageClassName: ""` disables default selection and dynamic provisioning. This distinction matters when diagnosing a Pending claim.
- The post attributed file-operation identity enforcement to the dynamic provisioner. Corrected it to say that the provisioner configures the identity and EFS enforces it for operations through the access point. The conclusion about `runAsUser` remains correct.

## Review Notes
- Verified all command forms and flags against official CLI references. The AWS CLI projection uses documented response fields and valid JMESPath syntax.
- The StorageClass uses the current `storage.k8s.io/v1` API and documented EFS parameters. Its quoted numeric parameters are strings as required; `Retain` and `Immediate` are valid choices for the stated diagnostic workflow.
- Confirmed that dynamic provisioning uses an existing filesystem and that PVC capacity does not impose an EFS storage quota. Fargate requires static provisioning for this use case.
- The distinction between provisioning failures and subsequent node-mount failures is sound. Controller IAM/tag checks, allocation-range exhaustion, and existing-directory permission checks are appropriate investigations.
- All technical links in the post resolved to the intended official resources. No deprecated command or API usage was found.
- The post does not pin a driver release and correctly advises checking documentation for the installed version; upstream master can differ from released versions.
- Validation was based on documentation and static review. No live EKS cluster provisioning, IAM calls, mounts, or cross-pod file operations were performed. Example resource names and the filesystem ID must be replaced with actual deployment values.
