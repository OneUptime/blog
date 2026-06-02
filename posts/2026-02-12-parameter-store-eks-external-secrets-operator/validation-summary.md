# Validation Summary: How to Use Parameter Store with EKS (External Secrets Operator)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Systems Manager Parameter Store
- AWS KMS
- Amazon EKS
- IAM Roles for Service Accounts (IRSA)
- External Secrets Operator
- Kubernetes Secrets, Deployments, and custom resources
- Helm
- Terraform AWS provider
- AWS CLI

## Sources Consulted
- External Secrets Operator AWS Parameter Store documentation: https://external-secrets.io/latest/provider/aws-parameter-store/
- External Secrets Operator AWS authentication documentation: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator metrics documentation: https://external-secrets.io/latest/api/metrics/
- External Secrets Operator Helm chart values: https://github.com/external-secrets/external-secrets/blob/main/deploy/charts/external-secrets/values.yaml
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- AWS Systems Manager SecureString and KMS documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/secure-string-parameter-kms-encryption.html
- AWS CLI `ssm put-parameter` documentation: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Terraform AWS provider `aws_ssm_parameter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_parameter

## Issues Found
- The External Secrets Operator manifests used `apiVersion: external-secrets.io/v1beta1`. Current ESO documentation uses `external-secrets.io/v1`, and recent ESO versions no longer serve the older beta API. Updated the `ClusterSecretStore` and `ExternalSecret` examples to `external-secrets.io/v1`.
- The IRSA trust policy only constrained the service account subject. AWS's EKS IRSA example also includes the OIDC audience condition for `sts.amazonaws.com`. Added the `aud` condition.
- The prerequisites did not state that the EKS cluster must have an associated IAM OIDC provider for IRSA. Added that prerequisite because the Terraform data source and IRSA flow depend on it.
- The Terraform SecureString example could be read as a safe way to manage real secret values without mentioning Terraform state exposure. Added a short caveat that real secret values are stored in Terraform state and that state must be protected or values should be created outside Terraform.

## Review Notes
The remaining commands and snippets are technically plausible for the documented flow. The Helm chart value `webhook.port` exists, though the explicit `9443` override is optional because the chart has its own default. The broad `kms:Decrypt` resource is functional but should be narrowed to the relevant KMS key in production.
