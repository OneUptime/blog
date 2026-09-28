# Validation Summary: Isolate Kubernetes Tenants with EFS Access Point Roots and POSIX Identities

## Status

validated

## Post Type

Technical guide with Kubernetes configuration and an AWS CLI inspection command.

## Technologies Covered

- Amazon EFS access points, POSIX identities, permissions, and filesystem policies
- Amazon EKS and Kubernetes tenant isolation
- AWS EFS CSI driver v3.5.0
- Kubernetes StorageClasses, persistent volumes, persistent volume claims, RBAC, and pod security
- AWS IAM, TLS mount authentication, AWS CLI, YAML, and JMESPath

## Sources Consulted

- [EKS tenant isolation guidance](https://docs.aws.amazon.com/eks/latest/best-practices/tenant-isolation.html)
- [EFS access-point root directories and security model](https://docs.aws.amazon.com/efs/latest/ug/enforce-root-directory-access-point.html)
- [EFS access-point identity enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)
- [EFS access points in IAM policies](https://docs.aws.amazon.com/efs/latest/ug/access-points-iam-policy.html)
- [EFS IAM client authorization and condition keys](https://docs.aws.amazon.com/efs/latest/ug/iam-access-control-nfs-efs.html)
- [EFS performance specifications](https://docs.aws.amazon.com/efs/latest/ug/performance.html)
- [EFS quotas and limits](https://docs.aws.amazon.com/efs/latest/ug/limits.html)
- [CSI driver v3.5.0 release metadata](https://api.github.com/repos/kubernetes-sigs/aws-efs-csi-driver/releases/tags/v3.5.0)
- [CSI driver v3.5.0 provisioning parameters and mount authentication](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md)
- [CSI driver v3.5.0 controller implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/controller.go) — inspected through the raw source endpoint.
- [CSI driver v3.5.0 dynamic provisioning example](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/examples/kubernetes/efs/dynamic_provisioning/README.md)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes persistent volumes and claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
- [AWS CLI describe-access-points reference](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-access-points.html)

## Issues Found

No technical issues found.

## Review Notes

- Left README.md unchanged. Both YAML examples parse successfully; StorageClass parameters are strings, the claim selects the defined class, and the stable API versions and fields are appropriate.
- Confirmed v3.5.0 is a published, non-prerelease driver version, released September 11, 2026. Reviewed the pinned implementation rather than assuming behavior from the development branch.
- Confirmed explicit UID/GID selection, root-path interpolation, UUID suffixing, and PVC-name-based access-point reuse. Disabling reuse is appropriate for the proposed tenant boundary.
- The example root is 72 characters including the UUID suffix and contains four directory components, within the documented 100-character and four-subdirectory limits. Longer namespace or claim names require the length check already mentioned in the post.
- Identity enforcement and existing-directory permission behavior agree with AWS documentation. Access-point roots are not an unconditional file-handle security boundary: AWS documents possible out-of-band file handles, with POSIX permission checks still enforced. The post appropriately combines separate identities, directories, and controls on alternate access.
- Confirmed that the CSI node mount identity is distinct from an application's service-account identity. Restricting StorageClass selection requires admission controls beyond ordinary PVC-create RBAC permissions. The filesystem-policy discussion correctly calls for checking other applicable allows.
- The PVC request does not enforce an EFS directory quota, and throughput is shared at the filesystem level. Retain leaves reclamation to the administrator; access-point and directory retirement need separate handling.
- Checked the AWS CLI operation, filesystem filter, response fields, and JMESPath projection against the command reference. The shell block also passes bash syntax checking.
- This was a documentation and source review with local syntax checks. No live AWS resources were provisioned and no Kubernetes mounts or isolation tests were executed. The deployment-specific IAM, admission, and pod-security controls still need the positive and negative tests described in the post.
