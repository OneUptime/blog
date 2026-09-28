# Validation Summary: Fix EFS CSI Provisioning When a StorageClass Exhausts Its GID Range

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and Kubernetes configuration.

## Technologies Covered
- Amazon EFS access points, POSIX identities, and service quotas
- Amazon EKS and the AWS EFS CSI driver v3.5.0
- Kubernetes StorageClasses, PersistentVolumes, and PersistentVolumeClaims
- AWS CLI, kubectl, JSONPath, and YAML

## Sources Consulted
- [EFS CSI driver v3.5.0 release](https://github.com/kubernetes-sigs/aws-efs-csi-driver/releases/tag/v3.5.0)
- [v3.5.0 GID allocator](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/gid_allocator.go) — inspected the raw tagged source.
- [v3.5.0 controller implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/driver/controller.go) — inspected allocation, parameter parsing, and directory construction.
- [v3.5.0 cloud implementation](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/pkg/cloud/cloud.go) — inspected access-point listing and pagination.
- [v3.5.0 provisioning parameters](https://github.com/kubernetes-sigs/aws-efs-csi-driver/blob/v3.5.0/docs/parameters.md)
- [AWS CLI describe-access-points](https://docs.aws.amazon.com/cli/latest/reference/efs/describe-access-points.html)
- [EFS access-point identity enforcement](https://docs.aws.amazon.com/efs/latest/ug/enforce-identity-access-points.html)
- [Amazon EFS quotas](https://docs.aws.amazon.com/efs/latest/ug/limits.html)
- [Amazon EKS EFS CSI documentation](https://docs.aws.amazon.com/eks/latest/userguide/efs-csi.html)
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/)
- [Kubernetes PersistentVolumes and claims](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [kubectl describe](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), [kubectl get](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), and [kubectl logs](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The guide correctly distinguishes identity allocation failures from access-point quota, authorization, and mount failures. Allocation occurs before access-point creation in the reviewed controller.
- The tagged allocator collects primary POSIX GIDs from access points on the file system and searches an inclusive interval. Consequently, 50000 through 50099 contains 100 candidates. Access points outside the namespace or cluster can occupy these identities.
- The v3.5.0 controller defines an access-point limit of 10000. The allocator caps the upper endpoint at the lower endpoint plus that limit when the requested difference exceeds it. The example range of 80000 through 84999 is below this cap. Driver limits and AWS service quotas remain distinct.
- Confirmed that the AWS CLI flags and projected response fields are valid. Pagination is automatic with the command as written; the reviewed driver's EFS listing implementation also follows continuation tokens.
- Reviewed the StorageClass API, field names, string-valued parameters, permissions, binding mode, retention policy, and TLS mount option. Omitting explicit UID/GID causes the allocated value to supply both identities. Supplying a fixed pair changes the identity policy as described.
- With no custom subPathPattern, v3.5.0 constructs the access-point directory from the PV name under basePath. The ensureUniqueDirectory setting controls UUID suffixes for custom patterns; the example still obtains distinct paths through distinct PV names.
- The new class affects future provisioning, while existing PVs retain their volume handles and access points. The advice to inspect pending claims and retained resources before deletion is consistent with Kubernetes volume lifecycle semantics.
- The log command is valid but selects a pod from the deployment by default. If the relevant error is absent in a replicated controller deployment, inspect the other replicas as well. Deployment names, resource names, filesystem ID, AWS credentials, region, and mount prerequisites must match the actual environment.
- Validation was based on official documentation, tagged source inspection, and local syntax checks. No live EKS/EFS provisioning, mount, or application write test was performed; the canary procedure remains an operator verification step.
