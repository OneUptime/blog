# Validation Summary: How to Set Up AKS Workload Identity Federation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- AKS OIDC issuer
- Microsoft Entra Workload ID
- Kubernetes service accounts and projected service account tokens
- AWS IAM OIDC identity providers and STS AssumeRoleWithWebIdentity
- Google Cloud Workload Identity Federation
- Azure managed identity federated credentials

## Sources Consulted
- Microsoft Learn: Deploy and configure an AKS cluster with Microsoft Entra Workload ID: https://learn.microsoft.com/en-us/azure/aks/workload-identity-deploy-cluster
- Microsoft Learn: Use a Microsoft Entra Workload ID on AKS: https://learn.microsoft.com/en-us/azure/aks/workload-identity-overview
- Microsoft Learn: az identity federated-credential CLI reference: https://learn.microsoft.com/en-us/cli/azure/identity/federated-credential
- AWS CLI Command Reference: create-open-id-connect-provider: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- AWS IAM User Guide: Obtain the thumbprint for an OpenID Connect identity provider: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS IAM User Guide: IAM and AWS STS condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html
- Google Cloud SDK Reference: gcloud iam workload-identity-pools providers create-oidc: https://docs.cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/providers/create-oidc
- Kubernetes Documentation: Projected Volumes, serviceAccountToken projection: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes Documentation: Service Accounts and token projection: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Documentation: Managing Service Accounts, bound service account tokens: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
- The post implied Microsoft Entra Workload ID is required for AWS and GCP federation. Updated the explanation to distinguish the AKS OIDC issuer and Kubernetes projected service account tokens from the Microsoft Entra Workload ID webhook.
- The AWS service account example used Azure Workload Identity annotations and labels. Removed them because the AWS example explicitly projects a Kubernetes service account token with the `sts.amazonaws.com` audience.
- The AWS OIDC provider command generated a certificate thumbprint from the endpoint certificate, which is not the top intermediate CA thumbprint AWS documents for manual thumbprint configuration. Removed the inline thumbprint generation and added a note explaining IAM's automatic thumbprint retrieval and the correct manual thumbprint requirement.
- The GCP attribute mapping used mixed object access and the binding only constrained service account name. Updated the mapping to bracket notation for Kubernetes claims and added an attribute condition for the `default` namespace.
- The Azure federated credential command used `--audience`, but the Azure CLI parameter is `--audiences`. Corrected the flag.
- The cross-cluster section described a managed identity as though it directly authenticated to another AKS API server. Reworded it to describe federation from an AKS service account to a user-assigned managed identity for Azure resource access.
- The OIDC discovery URL examples could create a double slash because AKS issuer URLs include a trailing slash. Changed the curl commands to append `.well-known/openid-configuration` directly to the issuer URL.
- The token validation explanation said external providers validate all Kubernetes claims. Tightened the wording to signature, issuer, audience, and configured subject or mapped claim restrictions.

## Review Notes
The tutorial is technically sound after the fixes. Future improvements could show separate minimal paths for AWS-only or GCP-only federation, where `--enable-workload-identity` is optional and the AKS OIDC issuer is the central prerequisite.
