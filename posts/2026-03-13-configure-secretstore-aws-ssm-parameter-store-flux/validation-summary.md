# Validation Summary: How to Configure SecretStore for AWS SSM Parameter Store with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes Secrets and ServiceAccounts
- External Secrets Operator
- AWS Systems Manager Parameter Store
- AWS IAM Roles for Service Accounts (IRSA)
- AWS KMS

## Sources Consulted
- External Secrets Operator AWS Parameter Store provider documentation: https://external-secrets.io/latest/provider/aws-parameter-store/
- External Secrets Operator AWS Access documentation: https://external-secrets.io/latest/provider/aws-access/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator Find Secrets guide: https://external-secrets.io/latest/guides/getallsecrets/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- AWS Systems Manager Parameter Store IAM access documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html
- AWS KMS encryption for Parameter Store SecureString parameters: https://docs.aws.amazon.com/kms/latest/developerguide/services-parameter-store.html
- Amazon EKS IRSA documentation: https://docs.aws.amazon.com/eks/latest/eksctl/iamserviceaccounts.html
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- Updated External Secrets Operator manifests from `external-secrets.io/v1beta1` to the current documented `external-secrets.io/v1` API used by ESO examples and API reference.
- Removed the `auth.jwt.serviceAccountRef` block from the SecretStore example. The post annotates the ESO controller ServiceAccount for IRSA, and ESO documentation states that when no auth method is configured, the AWS SDK credential chain uses the controller pod identity for AWS calls. The previous snippet mixed controller-pod IRSA with service-account-token authentication.
- Corrected the `dataFrom.find.conversionStrategy: Unicode` comment. ESO's Unicode conversion encodes invalid Kubernetes Secret key characters, such as `/`, and does not convert `/myapp/prod/database-url` into `DATABASE_URL`.

## Review Notes
The IAM policy, Flux Kustomization shape, kubectl verification commands, Parameter Store path usage, and KMS decrypt requirement for customer-managed SecureString keys are technically sound. If using EKS Pod Identity instead of IRSA, ESO's AWS Access documentation notes that `serviceAccountRef` should not be used and the SecretStore should also omit the `auth` block.
