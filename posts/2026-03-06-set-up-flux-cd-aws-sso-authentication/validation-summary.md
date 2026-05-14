# Validation Summary: How to Set Up Flux CD with AWS SSO Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EKS
- AWS IAM Identity Center
- AWS CLI v2
- Kubernetes RBAC
- EKS aws-auth ConfigMap
- EKS Access Entries
- Flux CD
- IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- Amazon EKS User Guide: Grant IAM users access to Kubernetes with a ConfigMap - https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- Amazon EKS User Guide: Create access entries - https://docs.aws.amazon.com/eks/latest/userguide/creating-access-entries.html
- Amazon EKS User Guide: Change authentication mode to use access entries - https://docs.aws.amazon.com/eks/latest/userguide/setting-up-access-entries.html
- Amazon EKS User Guide: Associate access policies with access entries - https://docs.aws.amazon.com/eks/latest/userguide/access-policies.html
- Amazon EKS User Guide: Kubernetes version lifecycle on EKS - https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI Command Reference: eks get-token - https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- AWS CLI Command Reference: eks create-access-entry - https://docs.aws.amazon.com/cli/latest/reference/eks/create-access-entry.html
- AWS IAM Identity Center User Guide: Referencing permission sets in resource policies, Amazon EKS Cluster config maps, and AWS KMS key policies - https://docs.aws.amazon.com/singlesignon/latest/userguide/referencingpermissionsets.html
- Flux Documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Documentation: RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The prerequisite specified Kubernetes 1.25 or later. Amazon EKS 1.25 is no longer a supported EKS version as of the validation date, so this was changed to require a currently supported EKS Kubernetes version.
- The permission set commands discarded the ARNs returned by `create-permission-set` and later selected `PermissionSets[0]`, which could attach the policy to the wrong permission set. The commands now capture the specific ClusterAdmin and Developer permission set ARNs and attach the inline policy to both.
- The IAM policy did not allow the SSO permission set roles to assume the pathless EKS access roles needed for `aws-auth` mapping. Added a scoped `sts:AssumeRole` statement for those roles.
- The AWS CLI profile example directly used SSO profiles for kubectl authentication while the corrected `aws-auth` mapping uses pathless IAM roles. The config now separates SSO source profiles from role-assuming profiles so the token identity matches the mapped Kubernetes role.
- The kubeconfig setup created only an admin context, but the verification section used a developer context. Added the developer SSO login and `aws eks update-kubeconfig` command.
- The `aws-auth` example mapped IAM Identity Center `AWSReservedSSO_*` role ARNs directly. EKS documentation states that `aws-auth` role ARNs cannot include paths, while IAM Identity Center reserved roles use a path. The example now maps pathless assumable roles instead.
- The `aws-auth` example mapped a Flux controller IRSA role to `system:masters`. IRSA is for AWS API access from pods and does not grant Flux controllers Kubernetes API access. Removed that mapping and clarified that Flux uses Kubernetes service accounts for cluster access.
- The Flux Kustomization patch used a label for the prune policy and a lowercase value. Updated it to use the documented Flux prune annotation with `Disabled`.
- The EKS Access Entries section claimed they are simply available in EKS 1.28+. Updated the wording to reflect the official requirement: the authentication mode must include the EKS API and the cluster must be on a supported platform version.
- The EKS Access Entries section did not show enabling an authentication mode that supports access entries. Added `aws eks update-cluster-config --access-config authenticationMode=API_AND_CONFIG_MAP`.
- The developer access-entry policy association comment said namespace-scoped access while the command used `type=cluster`. Updated the comment to match the command.
- Troubleshooting commands still referenced the wrong SSO profile and checked only `AWSReservedSSO` role names after the `aws-auth` mapping was changed to pathless roles. Updated those examples.

## Review Notes
The post is technically valid after the corrections. For future improvement, the tutorial could add explicit IAM role trust-policy examples for the pathless `EKSClusterAdmin` and `EKSDeveloper` roles used with `aws-auth`, or make EKS Access Entries the primary path and present `aws-auth` only as a legacy fallback.
