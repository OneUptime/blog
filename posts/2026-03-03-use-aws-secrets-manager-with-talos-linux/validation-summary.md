# Validation Summary: How to Use AWS Secrets Manager with Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- AWS Secrets Manager
- AWS CLI
- External Secrets Operator
- Secrets Store CSI Driver
- AWS Secrets and Configuration Provider
- IAM Roles for Service Accounts
- Amazon VPC interface endpoints

## Sources Consulted
- AWS CLI Command Reference: `aws secretsmanager create-secret` - https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- AWS CLI Command Reference: `aws ec2 create-vpc-endpoint` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- External Secrets Operator ClusterSecretStore API - https://external-secrets.io/latest/api/clustersecretstore/
- External Secrets Operator ExternalSecret API - https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator lifecycle and refresh policy docs - https://external-secrets.io/latest/guides/ownership-deletion-policy/
- External Secrets Operator metrics docs - https://external-secrets.io/v0.8.0/api/metrics/
- Secrets Store CSI Driver installation docs - https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation
- Secrets Store CSI Driver auto rotation docs - https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- Secrets Store CSI Driver sync-as-Kubernetes-Secret docs - https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- AWS Secrets Store CSI Driver provider documentation - https://github.com/aws/secrets-store-csi-driver-provider-aws
- AWS Secrets Manager ASCP examples - https://docs.aws.amazon.com/secretsmanager/latest/userguide/ascp-examples.html
- AWS Secrets Manager ASCP with IRSA docs - https://docs.aws.amazon.com/secretsmanager/latest/userguide/integrating_ascp_irsa.html

## Issues Found
- Updated External Secrets Operator manifests from `external-secrets.io/v1beta1` to the current documented `external-secrets.io/v1` API version.
- Corrected the CSI Driver description to clarify that it avoids Kubernetes Secret objects only when sync-as-secret is not enabled.
- Added CSI Driver `tokenRequests` Helm values required when the driver is installed separately from the AWS provider.
- Added missing AWS provider authentication guidance and a service account annotation example for IRSA, because the Deployment referenced `my-app-sa` without showing how it obtains AWS permissions.
- Added `region: us-east-1` to the AWS `SecretProviderClass` so the provider does not depend on node topology labels for region discovery.
- Escaped hyphenated AWS provider `jmesPath` `objectAlias` values as required by the provider documentation.
- Added a note that pods using synced Kubernetes Secrets as environment variables must be restarted after rotation to observe new environment variable values.
- Replaced the ESO metrics check against the Kubernetes API server `/metrics` endpoint with a port-forward to the External Secrets Operator deployment and a request to its own `/metrics` endpoint.
- Qualified the wrapping-up claim so the CSI approach is described as working on Talos when AWS authentication and network access are configured correctly.

## Review Notes
The post is technically relevant and the AWS CLI, IAM policy shape, Kubernetes manifests, VPC endpoint command, and rotation settings are broadly correct after the fixes. The CSI provider documentation is primarily written for EKS; self-managed Talos clusters need equivalent OIDC/web identity setup for IRSA-style authentication.
