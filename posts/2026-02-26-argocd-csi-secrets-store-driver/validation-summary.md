# Validation Summary: How to Use CSI Secrets Store Driver with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Application manifests and diff customization
- Kubernetes Secrets Store CSI Driver
- SecretProviderClass resources
- HashiCorp Vault CSI provider
- AWS Secrets Manager CSI provider
- Azure Key Vault CSI provider
- Google Secret Manager CSI provider
- Kubernetes Deployments, CSI volumes, and synced Secrets

## Sources Consulted
- Secrets Store CSI Driver concepts: https://secrets-store-csi-driver.sigs.k8s.io/concepts.html
- Secrets Store CSI Driver Helm chart and values: https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts/index.yaml and https://github.com/kubernetes-sigs/secrets-store-csi-driver/tree/main/charts/secrets-store-csi-driver
- Secrets Store CSI Driver sync as Kubernetes Secret: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Secrets Store CSI Driver secret auto rotation: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- HashiCorp Vault CSI provider docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi
- HashiCorp Vault CSI provider installation docs: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/installation
- AWS Secrets Store CSI Driver provider docs and Helm chart index: https://github.com/aws/secrets-store-csi-driver-provider-aws and https://aws.github.io/secrets-store-csi-driver-provider-aws/index.yaml
- Azure Key Vault provider docs and Helm chart index: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver and https://azure.github.io/secrets-store-csi-driver-provider-azure/charts/index.yaml
- Google Secret Manager CSI provider docs and examples: https://github.com/GoogleCloudPlatform/secrets-store-csi-driver-provider-gcp
- Argo CD diff customization docs: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/

## Issues Found
- The Secrets Store CSI Driver Helm chart version was outdated at `1.4.0`. Updated it to `1.6.0`, the latest chart version in the official chart index consulted on 2026-05-20.
- The HashiCorp Vault Helm chart version was outdated at `0.28.0`. Updated it to `0.32.0`, matching the current HashiCorp chart documentation and chart index.
- The AWS provider Helm chart version was outdated at `0.3.0`. Updated it to `3.1.0`, matching the current AWS provider chart index.
- The Azure provider Helm chart version was outdated at `1.5.0`. Updated it to `1.8.1`, matching the current Azure provider chart index.
- The environment-variable Deployment example omitted required `apps/v1` Deployment fields: `spec.selector` and matching pod template labels. Added those fields so the manifest is structurally valid.
- The Argo CD section said generated synced Secrets should be ignored because they are not in Git. `ignoreDifferences` only customizes diff behavior for resources Argo CD is comparing; it is not needed for ordinary untracked runtime-created Secrets. Reworded the guidance to apply only when an application also includes a Secret manifest and needs Argo CD to ignore CSI-managed fields.

## Review Notes
- The provider-specific `SecretProviderClass` parameters match the current examples for Vault, AWS, Azure, and GCP.
- Secrets Store CSI Driver chart `1.6.0` declares Kubernetes `>=1.30.0-0`; teams running older clusters should pin a supported earlier driver chart.
- The GCP provider repository states that it is not an officially supported Google product, although it is the referenced Google Secret Manager provider for this CSI driver.
