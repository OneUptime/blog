# Validation Summary: How to Configure Flux CD with AWS Secrets Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- External Secrets Operator
- AWS Secrets Manager
- Amazon EKS IAM Roles for Service Accounts (IRSA)
- Kubernetes Secrets, SecretStore, ClusterSecretStore, and ExternalSecret resources
- AWS CLI and kubectl

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- External Secrets Operator API reference: https://external-secrets.io/main/api/spec/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator chart repository index: https://charts.external-secrets.io/index.yaml
- External Secrets Operator Helm chart values: https://raw.githubusercontent.com/external-secrets/external-secrets/main/deploy/charts/external-secrets/values.yaml
- AWS Secrets Manager IAM policy examples: https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_iam-policies.html
- AWS CLI Secrets Manager create-secret reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/create-secret.html
- Amazon EKS service account IAM role documentation: https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html
- Amazon EKS Workshop External Secrets Operator example: https://www.eksworkshop.com/docs/security/secrets-management/secrets-manager/external-secrets/

## Issues Found
- The HelmRelease was defined in the `external-secrets` namespace while relying on Helm `install.createNamespace` to create that namespace. Flux must be able to apply the HelmRelease object before Helm runs, so the example was changed to place the HelmRelease in `flux-system` and set `spec.targetNamespace: external-secrets`.
- The ESO chart version was pinned to `0.12.x` while the current chart repository lists `2.4.1` as the latest stable release on 2026-04-28. The example was updated to `2.4.x`.
- The ESO manifests used `external-secrets.io/v1beta1`. Current ESO chart defaults disable v1beta1 serving for backward compatibility only, so the examples were updated to `external-secrets.io/v1`.
- The Helm values used `env`, but the current ESO chart exposes additional operator environment variables through `extraEnv`. The values snippet was corrected.
- The EKS OIDC issuer lookup omitted `--region us-east-1` while the rest of the example hardcodes `us-east-1`. The command was updated to avoid generating a trust policy for the wrong cluster region.
- The TLS example was titled "Sync a Plain Text Secret" even though it maps certificate and private key properties into a `kubernetes.io/tls` Secret. The heading was corrected to "Sync a TLS Secret".
- The troubleshooting section attempted to run AWS CLI commands inside the ESO deployment. The ESO image is not an AWS CLI troubleshooting image, so this was replaced with a service account annotation check and a temporary `amazon/aws-cli:2` pod using the ESO service account.

## Review Notes
The IAM policy scope and Secrets Manager ARN wildcard pattern are technically valid for path-style secret names. The examples still use placeholder account IDs, cluster names, and secret values; readers must replace those with their own environment-specific values.
