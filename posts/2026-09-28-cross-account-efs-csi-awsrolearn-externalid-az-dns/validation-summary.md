# Validation Summary: How to Configure Cross-Account EFS CSI Provisioning with `awsRoleArn`, `externalId`, and AZ-Resilient DNS Resolution

## Status

validated

## Post Type

Technical configuration guide with IAM JSON, Kubernetes YAML, and kubectl commands.

## Technologies Covered

- Amazon EFS, access points, and NFS mounts
- Amazon EKS and Kubernetes CSI dynamic provisioning
- AWS EFS CSI driver v3.5.0 and amazon-efs-utils
- AWS IAM, STS AssumeRole, external IDs, and EFS client authorization
- VPC networking, Route 53 private DNS, and Availability Zone IDs
- Kubernetes Secrets, StorageClasses, PVCs, PVs, and kubectl

## Sources Consulted

- [Driver v3.5.0 cross-account guide](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/examples/kubernetes/efs/cross_account_mount/README.md)
- [Driver v3.5.0 controller implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/controller.go)
- [Driver v3.5.0 node implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/node.go)
- [Driver v3.5.0 cloud implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/cloud/cloud.go)
- [Driver v3.5.0 IAM policy example](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/iam-policy-example.json)
- [Driver 3.x changelog at v3.5.0](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/CHANGELOG-3.x.md)
- [Amazon EFS utilities README](https://raw.githubusercontent.com/aws/efs-utils/master/README.md)
- [AWS IAM external ID guidance](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html)
- [EFS IAM client authorization](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- [EFS network access and security groups](https://docs.aws.amazon.com/efs/latest/ug/network-access.html)
- [AWS Availability Zone IDs](https://docs.aws.amazon.com/ram/latest/userguide/working-with-az-ids.html)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [CSI StorageClass secret references](https://kubernetes-csi.github.io/docs/secrets-and-credentials-storage-class.html)
- [kubectl describe reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)

## Issues Found

- **Default AZ selection needed a physical-zone caveat.** The version paragraph described per-node AZ target selection without explaining that v3.5.0 builds its default IP map using `MountTarget.AZName` and looks up the node's AZ name. Names can refer to different physical zones across accounts. Clarified that this mode does not guarantee physical AZ alignment and that the configured DNS mode uses AZ IDs. Added a link to the released controller implementation. The recommended Secret and StorageClass remain correct.

## Review Notes

- Confirmed exact secret keys and parsing, STS external ID forwarding, DNS-mode volume attributes, and rejection of manually supplied `crossaccount` mount options in v3.5.0.
- Confirmed the v3.1.0 default-selection change in the changelog and checked the resulting behavior in v3.5.0 source. Existing PV attributes are stored provisioning results; an upgrade alone does not regenerate the mapping.
- Verified the trust-policy structure, matching external ID values, distinct API and client authorization paths, and access-point permission/tag requirements.
- Verified the AZ-ID DNS format, hosted-zone apex A record, client DNS visibility requirement, and TCP 2049 connectivity requirements. DNS selection applies when mounting; it does not migrate established NFS sessions.
- The Secret and StorageClass use supported APIs and string-valued parameters. The kubectl resource forms, YAML output option, container flag, namespace flag, and `--since=10m` syntax match the official references.
- The example uses `Retain`, so PVC deletion does not automatically invoke access-point cleanup. The final cleanup warning applies when driver deletion is invoked with directory deletion enabled; source confirms a separate controller mount with TLS and IAM authorization.
- Account IDs, role names, file-system ID, PV name, and canary resources are environment-specific examples. The PVC inspection command uses the current namespace, and the log command assumes the stated controller deployment/container names.
- All referenced resources were checked; GitHub source files were also read through their official raw-content URLs. The efs-utils master URL is a moving reference, while driver links are pinned to v3.5.0.
- Review consisted of documentation/source verification and local snippet syntax checks. No AWS resources were provisioned, and live cross-account mounts, DNS resolution, and AZ recovery were not exercised.
