# Validation Summary: How to Use Terraform with Flux for GitOps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Flux CD
- Kubernetes
- Amazon EKS
- GitHub Terraform provider
- Kubernetes Terraform provider
- Flux Terraform provider
- HelmRelease, Kustomization, GitRepository, HelmRepository, Provider, and Alert Flux custom resources

## Sources Consulted
- Flux Terraform provider documentation: https://registry.terraform.io/providers/fluxcd/flux/latest/docs
- Flux `flux_bootstrap_git` resource documentation: https://registry.terraform.io/providers/fluxcd/flux/latest/docs/resources/bootstrap_git
- Flux source-controller API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux kustomize-controller API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux notification-controller API reference: https://fluxcd.io/flux/components/notification/api/
- Flux notification provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Terraform Kubernetes provider `kubernetes_manifest` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- Terraform GitHub provider deploy key documentation: https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_deploy_key
- Terraform TLS provider `tls_private_key` documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI `eks get-token` documentation: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Bitnami NGINX chart metadata: https://github.com/bitnami/charts/blob/main/bitnami/nginx/Chart.yaml
- Bitnami deprecated NGINX Ingress Controller chart metadata: https://github.com/bitnami/charts/blob/main/bitnami/nginx-ingress-controller/Chart.yaml

## Issues Found
- The post stated Terraform 1.0 or later, but the current Flux Terraform provider requires Terraform 1.5 or later. Updated the prerequisite and `required_version` constraint to `>= 1.5`.
- The Terraform snippets used `tls_private_key` but did not declare the `hashicorp/tls` provider. Added the TLS provider to `required_providers`.
- The EKS example used Kubernetes `1.29`, which is no longer an available supported EKS creation version as of May 22, 2026. Updated the example to Kubernetes `1.34`, which is in EKS standard support.
- The GitRepository example referenced an `app-repo-credentials` Secret that the tutorial never created. Removed the `secretRef` so the example is valid for a public application manifests repository.
- The HelmRelease example used Bitnami's `nginx-ingress-controller` chart with version `9.x`, but that chart is now deprecated. Changed the example to the maintained Bitnami `nginx` chart with version `22.x` and updated the release and namespace names accordingly.
- The Flux notification `Provider` and `Alert` examples used `notification.toolkit.fluxcd.io/v1`, but current Flux documentation shows `Provider` and `Alert` as `v1beta3` resources. Updated both API versions.
- The Slack notification provider put the webhook URL directly in `spec.address`; Flux documentation recommends storing sensitive addresses in a Secret and referencing it with `secretRef`. Added a Kubernetes Secret and updated the Provider to use `secretRef`.
- The multi-cluster example used `for_each` with a single Flux provider configuration, which would not actually target multiple clusters. Updated the example to show distinct `flux_bootstrap_git` resources using cluster-specific provider aliases.

## Review Notes
- The examples still store some sensitive values in Terraform-managed resources, which means those values can be present in Terraform state. This is common in compact tutorials but should be revisited for production guidance.
- Flux's 2026 guidance increasingly recommends Flux Operator based bootstrap patterns for some production use cases, but the Flux Terraform provider remains documented and valid for bootstrapping.
