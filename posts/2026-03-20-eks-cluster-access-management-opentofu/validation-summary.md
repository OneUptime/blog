# Validation Summary: How to Set Up EKS Cluster Access Management with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- AWS IAM
- EKS access entries and access policies
- Kubernetes RBAC
- OpenTofu
- AWS CLI
- Terraform-compatible AWS and Kubernetes providers

## Sources Consulted
- Amazon EKS User Guide: Access entries overview: https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- Amazon EKS User Guide: Change authentication mode to use access entries: https://docs.aws.amazon.com/eks/latest/userguide/setting-up-access-entries.html
- Amazon EKS User Guide: Create access entries: https://docs.aws.amazon.com/eks/latest/userguide/creating-access-entries.html
- Amazon EKS User Guide: Associate access policies with access entries: https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html
- Amazon EKS User Guide: Migrating existing aws-auth ConfigMap entries to access entries: https://docs.aws.amazon.com/en_en/eks/latest/userguide/migrating-access-entries.html
- AWS CLI Command Reference: `aws eks list-access-entries`: https://docs.aws.amazon.com/cli/latest/reference/eks/list-access-entries.html
- HashiCorp AWS provider docs: `aws_eks_cluster`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_cluster.html.markdown
- HashiCorp AWS provider docs: `aws_eks_access_entry`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_access_entry.html.markdown
- HashiCorp AWS provider docs: `aws_eks_access_policy_association`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eks_access_policy_association.html.markdown
- Kubernetes documentation: RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- OpenTofu docs: CLI basics and commands: https://opentofu.org/docs/cli/commands/
- OpenTofu docs: `tofu init`: https://opentofu.org/docs/cli/init/
- OpenTofu docs: `tofu plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs: `tofu apply`: https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The introduction and prerequisites incorrectly framed access entries as an EKS 1.29-only feature. AWS documents access entries as platform-version dependent and supported for EKS 1.28+ on compatible platform versions, so I corrected the version guidance.
- Step 3 said the example granted access to a single namespace, but the code scoped permissions to two namespaces (`apps` and `staging`). I updated the wording to match the actual configuration.
- Step 4 implied a generic node-group access-entry pattern. AWS documents `EC2_LINUX` access entries as the manual pattern for self-managed Linux or Bottlerocket nodes, while managed node groups and Fargate are handled by EKS. I corrected the section heading and comment to reflect that.
- Step 5 used the deprecated `extensions` API group in the RBAC example and combined core and `apps` resources in one rule. I replaced that with separate rules for the core API group and the `apps` API group so the example matches current Kubernetes RBAC usage.
- The conclusion said changes are reflected immediately. AWS documents access entry creation and updates as eventually consistent, so I updated the conclusion to note the delay and also clarified that enabling access entries is not reversible back to a mode that removes the EKS API.

## Review Notes
- The post is technically valid after the fixes above.
- Using both EKS access policies and Kubernetes RBAC groups on the same `STANDARD` access entry is supported by AWS; the post's examples are compatible with that model.
- `bootstrap_cluster_creator_admin_permissions` is a cluster-creation-time setting. The current example is valid for new cluster creation, but it should not be treated as a general post-creation toggle.
- The OpenTofu CLI commands were verified against official OpenTofu documentation because the `tofu` binary is not installed in this review environment.
