# Validation Summary: How to Use Terraform with Crossplane

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Crossplane
- Kubernetes
- Amazon EKS
- AWS IAM Roles for Service Accounts (IRSA)
- Upbound AWS providers
- Helm

## Sources Consulted
- Crossplane installation documentation: https://docs.crossplane.io/latest/get-started/install/
- Crossplane provider runtime configuration documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane Composition documentation: https://docs.crossplane.io/latest/composition/compositions/
- Crossplane CompositeResourceDefinition documentation: https://docs.crossplane.io/latest/composition/composite-resource-definitions/
- Upbound provider family documentation: https://docs.upbound.io/manuals/packages/providers/provider-families/
- Upbound ProviderConfig API reference: https://marketplace.upbound.io/providers/upbound/provider-family-aws/latest/resources/aws.upbound.io/ProviderConfig/v1beta1
- Upbound AWS RDS Instance API reference: https://marketplace.upbound.io/providers/upbound/provider-aws-rds/v0.47.0/resources/rds.aws.upbound.io/Instance/v1beta1
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html
- Amazon EKS service account role association documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html

## Issues Found
- The Crossplane Helm example pinned version 1.14.0 and enabled `--enable-composition-revisions`, which is unnecessary for the current v1.20-era example because composition revisions are no longer an alpha opt-in feature. Updated the Helm chart version to 1.20.0 and removed the obsolete flag.
- The AWS provider example installed only `provider-aws-s3`, but the Composition creates an RDS `Instance`. Added `provider-aws-rds` and the matching RDS IAM policy attachment.
- The IRSA setup created an IAM role and set `ProviderConfig` credentials to `IRSA`, but did not annotate the Crossplane provider runtime service account with the IAM role ARN. Added a `DeploymentRuntimeConfig` with the required EKS role annotation and referenced it from the AWS providers.
- The IAM trust policy did not include the OIDC `aud` condition recommended for EKS IRSA. Added the `sts.amazonaws.com` audience condition to the Crossplane role and the application role example.
- The Composition used legacy `spec.resources`, which Crossplane documentation marks as deprecated in favor of `mode: Pipeline` with composition functions. Replaced it with a Pipeline Composition using `function-patch-and-transform`.
- The Composition referenced the patch-and-transform function without installing it. Added a Crossplane `Function` resource for `function-patch-and-transform`.
- The RDS managed resource omitted `providerConfigRef`, so it would not explicitly use the configured AWS ProviderConfig. Added `providerConfigRef.name = "default"`.
- The RDS managed resource omitted master user configuration. Added `username` and `manageMasterUserPassword` so the sample includes required database creation settings without embedding a static password.

## Review Notes
Terraform is not installed in this review environment, so `terraform fmt` and `terraform validate` could not be run locally. The snippets are still partial tutorial examples and would need surrounding variables, VPC outputs, Kubernetes provider connectivity, and staged application of CRD-backed resources in a real repository.
