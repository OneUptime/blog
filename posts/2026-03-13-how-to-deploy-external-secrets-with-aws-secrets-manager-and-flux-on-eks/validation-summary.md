# Validation Summary: How to Deploy External Secrets with AWS Secrets Manager and Flux on EKS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- External Secrets Operator
- AWS Secrets Manager
- AWS Systems Manager Parameter Store
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- Flux HelmRepository and HelmRelease
- Kubernetes Secrets and custom resources
- Helm
- AWS CLI
- kubectl
- eksctl

## Sources Consulted
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator AWS access documentation: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator components and Helm values documentation: https://external-secrets.io/latest/api/components/
- External Secrets Operator Helm chart metadata and values: https://github.com/external-secrets/external-secrets/tree/main/deploy/charts/external-secrets
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- eksctl IAM Roles for Service Accounts documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS Secrets Manager service authorization reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_awssecretsmanager.html
- AWS CLI Secrets Manager create-secret documentation: https://docs.aws.amazon.com/cli/v1/reference/secretsmanager/create-secret.html
- AWS Secrets Manager ListSecrets API documentation: https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_ListSecrets.html

## Issues Found
- The post pinned the External Secrets Operator Helm chart to `0.9.*`, which is deprecated according to ESO support documentation and no longer current. Updated the chart version to `2.4.*`, matching the current chart major/minor available during validation.
- The External Secrets manifests used `apiVersion: external-secrets.io/v1beta1`. Current ESO documentation uses `external-secrets.io/v1`, and the chart marks v1beta1 serving as deprecated compatibility behavior. Updated `ClusterSecretStore` and `ExternalSecret` examples to `external-secrets.io/v1`.
- The IAM policy granted `secretsmanager:ListSecrets` against secret ARNs. AWS lists `ListSecrets` without a resource type, so it must be granted with `Resource: "*"`. Split `ListSecrets` into a separate statement with `Resource: "*"`.
- The prerequisite listed EKS `1.25 or later`, but Amazon EKS 1.25 is no longer a supported EKS version in 2026. Changed the prerequisite to require an existing supported EKS cluster.
- The AWS Secrets Manager create and update commands did not specify a region, while the policy and `ClusterSecretStore` examples use `us-west-2`. Added `--region us-west-2` to keep the examples consistent.

## Review Notes
- The Flux `HelmRepository` and `HelmRelease` API versions and fields are valid for current Flux documentation.
- The `eksctl create iamserviceaccount` command and IRSA flow are consistent with official eksctl documentation, assuming the cluster already has an associated IAM OIDC provider.
- The manual refresh annotation, `dataFrom.extract`, and AWS JWT service account reference patterns are consistent with current External Secrets Operator documentation.
