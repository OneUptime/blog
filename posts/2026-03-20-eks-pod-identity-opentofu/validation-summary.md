# Validation Summary: How to Configure EKS Pod Identity with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- Amazon EKS
- EKS Pod Identity
- AWS Identity and Access Management (IAM)
- AWS provider resources for EKS and IAM
- Kubernetes provider resources for service accounts and deployments
- Kubernetes service accounts

## Sources Consulted
- Amazon EKS Pod Identity overview: https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html
- Amazon EKS trust policy for Pod Identity roles: https://docs.aws.amazon.com/eks/latest/userguide/pod-id-role.html
- Amazon EKS supported SDK and AWS CLI versions for Pod Identity: https://docs.aws.amazon.com/eks/latest/userguide/pod-id-minimum-sdk.html
- Amazon EKS workload configuration with service accounts: https://docs.aws.amazon.com/eks/latest/userguide/pod-id-configure-pods.html
- Amazon EKS `CreatePodIdentityAssociation` API reference: https://docs.aws.amazon.com/eks/latest/APIReference/API_CreatePodIdentityAssociation.html
- Amazon EKS IAM best practices, including Pod Identity guidance: https://docs.aws.amazon.com/eks/latest/best-practices/identity-and-access-management.html
- AWS IAM example for S3 bucket/object read-write scoping: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_examples_s3_rw-bucket.html
- Amazon S3 identity-based policy examples: https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html
- AWS provider documentation for `aws_eks_addon`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_addon
- AWS provider documentation for `aws_eks_addon_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_addon_version
- AWS provider documentation for `aws_eks_pod_identity_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eks_pod_identity_association
- Kubernetes provider documentation for `kubernetes_service_account`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account
- Kubernetes provider documentation for `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- OpenTofu CLI documentation for `init`, `plan`, and `apply`: https://opentofu.org/docs/cli/init/ , https://opentofu.org/docs/cli/commands/plan/ , https://opentofu.org/docs/v1.9/cli/commands/apply/

## Issues Found
- The post description framed Pod Identity as a general replacement for IRSA. I narrowed that wording to a simpler alternative for supported EKS workloads, because AWS still documents IRSA as a valid preferred option in some cases and Pod Identity has workload restrictions.
- The prerequisites omitted two required runtime conditions from the AWS documentation: Linux EC2 worker nodes and a supported AWS SDK or AWS CLI using the default credential chain. I added both so the guide matches supported EKS Pod Identity environments.
- The sample IAM policy combined `s3:ListBucket` with object-level actions in a single statement over both bucket and object ARNs. I split it into separate bucket-level and object-level statements to match AWS IAM and S3 policy guidance.
- The OpenTofu configuration did not guarantee that the Kubernetes service account existed before the Pod Identity association, or that the deployment waited for the association. I added explicit `depends_on` relationships so the resource graph matches the documented setup order.

## Review Notes
- The Pod Identity trust policy in the post is valid as a minimal working example. AWS best-practice guidance also recommends additional condition keys such as `aws:SourceOrgId` or request-tag constraints for stronger confused-deputy protection.
- Amazon EKS documents Pod Identity associations as eventually consistent. The added dependencies fix creation order, but association changes can still take several seconds to propagate.
- AWS currently documents Pod Identity compatibility in terms of EKS platform versions as well as Kubernetes versions. The post's `1.24+` prerequisite is still consistent with other AWS Pod Identity integration docs, but readers should verify current platform-version requirements for their cluster.
- The `tofu` binary is not installed in this workspace, so command validation was done against official OpenTofu documentation rather than local CLI help output.
