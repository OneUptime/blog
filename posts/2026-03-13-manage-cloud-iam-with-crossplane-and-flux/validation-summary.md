# Validation Summary: How to Manage Cloud IAM with Crossplane and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Crossplane
- Upbound provider-aws-iam
- AWS IAM
- Amazon EKS IRSA
- Kubernetes ServiceAccounts
- GitOps

## Sources Consulted
- Upbound Marketplace: provider-aws-iam v2.5.3 managed resources, including Policy, Role, RolePolicyAttachment, User, and UserPolicyAttachment: https://marketplace.upbound.io/providers/upbound/provider-aws-iam/v2.5.3
- Upbound Marketplace: RolePolicyAttachment API reference for `iam.aws.m.upbound.io/v1beta1`: https://marketplace.upbound.io/providers/upbound/provider-aws-iam/v2.5.3/resources/iam.aws.m.upbound.io/RolePolicyAttachment/v1beta1
- Upbound Marketplace: Role API reference for `iam.aws.m.upbound.io/v1beta1`: https://marketplace.upbound.io/providers/upbound/provider-aws-iam/v2.5.3/resources/iam.aws.m.upbound.io/Role/v1beta1
- Crossplane managed resources documentation for `ProviderConfig` references and `crossplane.io/external-name`: https://docs.crossplane.io/latest/managed-resources/managed-resources/
- Flux Kustomization documentation and API reference for `apiVersion`, `path`, `prune`, `sourceRef`, and `dependsOn`: https://fluxcd.io/flux/components/kustomize/kustomizations/ and https://fluxcd.io/flux/components/kustomize/api/v1/
- Amazon EKS documentation for assigning IAM roles to Kubernetes service accounts and the `eks.amazonaws.com/role-arn` annotation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS IRSA overview: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon S3 IAM permissions documentation for bucket and object resource scoping: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html

## Issues Found
- The Crossplane IAM examples used the older cluster-scoped API group `iam.aws.upbound.io/v1beta1`. Updated them to the current provider-aws-iam v2.x namespaced API group `iam.aws.m.upbound.io/v1beta1`.
- The IAM managed resources did not include a namespace, which is required for the namespaced v2.x resources. Added `namespace: crossplane-system` consistently to the Crossplane IAM resources.
- The examples used `spec.forProvider.name` for Policy, Role, and User resources, but the current CRDs do not define that field. Removed those fields and added `crossplane.io/external-name` annotations where a specific AWS IAM friendly name was needed.
- The current Crossplane v2 ProviderConfig reference requires an explicit `kind`. Added `kind: ProviderConfig` to each `providerConfigRef`.
- The prerequisite text did not identify the v2.x provider namespace behavior. Updated it to require `provider-aws-iam` v2.x and a same-namespace `ProviderConfig`.
- The wildcard IAM best-practice statement was too absolute because some AWS actions require wildcard resources. Reworded it to discourage broad wildcards while allowing cases where AWS requires them.
- Fixed the `prune: true` best-practice sentence so the database contrast reads correctly and does not obscure the IAM cleanup recommendation.

## Review Notes
The Flux Kustomization fields and the EKS IRSA ServiceAccount annotation are technically correct. The post uses placeholder AWS account, region, OIDC provider ID, and bucket values; readers must replace them with values from their own EKS cluster and AWS account.
