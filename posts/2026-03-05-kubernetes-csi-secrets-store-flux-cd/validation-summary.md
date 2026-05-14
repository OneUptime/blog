# Validation Summary: How to Use Kubernetes CSI Secrets Store with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD HelmRelease and Kustomization resources
- Secrets Store CSI Driver
- AWS Secrets Manager and AWS Secrets and Configuration Provider
- Azure Key Vault Provider for Secrets Store CSI Driver
- HashiCorp Vault Secrets Store CSI provider
- Kubernetes Secrets and secret rotation

## Sources Consulted
- Secrets Store CSI Driver installation documentation: https://secrets-store-csi-driver.sigs.k8s.io/getting-started/installation.html
- Secrets Store CSI Driver sync as Kubernetes Secret documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Secrets Store CSI Driver secret auto rotation documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/secret-auto-rotation
- Secrets Store CSI Driver Helm chart index: https://kubernetes-sigs.github.io/secrets-store-csi-driver/charts/index.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository and Helm chart source documentation: https://fluxcd.io/flux/components/source/helmcharts/
- AWS Secrets and Configuration Provider documentation: https://aws.github.io/secrets-store-csi-driver-provider-aws/
- AWS Secrets Manager ASCP examples: https://docs.aws.amazon.com/secretsmanager/latest/userguide/ascp-examples.html
- AWS provider Helm chart index: https://aws.github.io/secrets-store-csi-driver-provider-aws/index.yaml
- Azure Key Vault provider for Secrets Store CSI Driver documentation: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-driver
- Azure Key Vault provider identity access documentation: https://learn.microsoft.com/en-us/azure/aks/csi-secrets-store-identity-access
- Azure provider Helm chart index: https://azure.github.io/secrets-store-csi-driver-provider-azure/charts/index.yaml
- HashiCorp Vault Secrets Store CSI provider documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi

## Issues Found
- The AWS provider Flux example referenced a `HelmRepository` named `aws-provider` without defining it. Added the `HelmRepository` using the official AWS provider chart repository URL.
- The Azure provider Flux example referenced a `HelmRepository` named `azure-provider` without defining it. Added the `HelmRepository` using the official Azure provider chart repository URL.
- The AWS provider chart version `0.3.x` was outdated compared with the current official chart index. Updated it to the current `3.x` series.
- The Azure provider chart version `1.5.x` was outdated compared with the current official chart index. Updated it to the current `1.8.x` series.
- The standalone provider HelmRelease examples omitted `secrets-store-csi-driver.install: false`. Both the AWS and Azure provider charts include the Secrets Store CSI Driver as an installable dependency by default, so this value is needed when the driver is already installed separately earlier in the post.
- The Secrets Store CSI Driver chart version `1.4.x` was outdated. Updated it to the current `1.6.x` chart series.

## Review Notes
- All YAML snippets were parsed successfully after the corrections.
- Secrets Store CSI Driver chart `1.6.x` currently requires Kubernetes `>=1.30.0-0` according to the official chart index. Clusters on older Kubernetes releases should pin to a supported earlier chart such as the `1.5.x` series.
- The AWS authentication note is technically valid for IRSA, but AWS also supports newer EKS Pod Identity flows for this provider.
