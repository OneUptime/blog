# Validation Summary: How to Configure Crossplane ProviderConfig for Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Crossplane ProviderConfig
- Crossplane AWS provider
- Upbound Azure provider
- Upbound GCP provider
- AWS IAM Roles for Service Accounts (IRSA)
- Azure service principals and AKS Workload Identity
- GKE Workload Identity
- AWS IAM policies

## Sources Consulted
- Crossplane Providers documentation: https://docs.crossplane.io/v1.20/concepts/providers/
- Crossplane latest Providers documentation: https://docs.crossplane.io/latest/packages/providers/
- Crossplane Workload Identity guide: https://docs.crossplane.io/latest/guides/crossplane-with-workload-identity/
- crossplane-contrib/provider-aws ProviderConfig source: https://raw.githubusercontent.com/crossplane-contrib/provider-aws/v0.54.2/apis/v1beta1/providerconfig_types.go
- Upbound provider-azure ProviderConfig source: https://raw.githubusercontent.com/upbound/provider-azure/v1.13.0/apis/v1beta1/types.go
- Upbound provider-gcp ProviderConfig source: https://raw.githubusercontent.com/upbound/provider-gcp/v1.14.0/apis/v1beta1/types.go
- Microsoft Azure CLI documentation for `az ad sp create-for-rbac`: https://learn.microsoft.com/cli/azure/ad/sp
- Upbound Marketplace ProviderConfig schema for provider-family-aws: https://marketplace.upbound.io/providers/upbound/provider-family-aws/latest/resources/aws.upbound.io/ProviderConfig/v1beta1
- GCP provider package documentation: https://pkg.go.dev/github.com/upbound/provider-gcp@v1.14.0/apis/v1beta1

## Issues Found
- The ProviderConfig credential source summary was too narrow. Updated it to include Filesystem and provider-specific sources such as OIDCTokenFile.
- The AWS IRSA service account name was inconsistent with the later troubleshooting command. Updated the `eksctl create iamserviceaccount` example to use `provider-aws`.
- The Azure service principal command used `--sdk-auth`, which has a current documented replacement. Updated it to `--json-auth`.
- The Azure ProviderConfig snippets used the older `azure.crossplane.io` API group and `InjectedIdentity` source. Updated the examples to `azure.upbound.io/v1beta1` and `OIDCTokenFile`, and added the required subscription, tenant, and client ID fields for AKS Workload Identity.
- The Azure Workload Identity setup was missing the federated credential and pod label required by Azure Workload Identity. Added commands to create the federated credential and patch the provider deployment template label.
- The GCP ProviderConfig snippets used the older `gcp.crossplane.io` API group. Updated them to `gcp.upbound.io/v1beta1`.
- The GCP Workload Identity commands used a Kubernetes service account name that did not match the provider controller service account. Updated the commands and troubleshooting check to use `provider-gcp`.
- The GKE cluster update command omitted location information. Added `--location=LOCATION`.
- The IAM least-privilege example used `aws:ResourceTag` for RDS create actions, which does not match create-time tagging. Split the RDS permissions so create uses `aws:RequestTag`, describe is allowed separately, resource-tag conditions apply to update/delete actions, and tag mutation is constrained by `aws:TagKeys`.
- The S3 permission set omitted `s3:GetBucketTagging`, which Crossplane may need when observing tags. Added it.

## Review Notes
ProviderConfig schemas are provider-specific and change across provider generations. The post now uses current Upbound API groups for Azure and GCP credential examples while preserving the existing AWS provider examples that match the verified crossplane-contrib ProviderConfig schema.
