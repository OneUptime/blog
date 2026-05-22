# Validation Summary: How to Handle Kubernetes Provider Authentication in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Kubernetes provider
- HashiCorp Helm provider
- AWS EKS
- Google Kubernetes Engine
- Azure Kubernetes Service
- Kubernetes service accounts and RBAC
- AWS CLI, gcloud CLI, kubectl, and kubelogin

## Sources Consulted
- HashiCorp Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Helm provider documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- HashiCorp AWS provider `aws_eks_cluster_auth` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/eks_cluster_auth
- AWS CLI `eks get-token` command reference: https://docs.aws.amazon.com/cli/latest/reference/eks/get-token.html
- Amazon EKS `aws-auth` ConfigMap documentation: https://docs.aws.amazon.com/eks/latest/userguide/auth-configmap.html
- Amazon EKS access entries documentation: https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html
- HashiCorp Google provider `google_client_config` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/client_config
- HashiCorp Google provider `google_container_cluster` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google Cloud `gcloud container clusters get-credentials` reference: https://cloud.google.com/sdk/gcloud/reference/container/clusters/get-credentials
- HashiCorp AzureRM `azurerm_kubernetes_cluster` data source documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/kubernetes_cluster
- Azure kubelogin `get-token` documentation: https://azure.github.io/kubelogin/cli/get-token.html
- Kubernetes service account administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The Helm provider examples used the older nested `kubernetes { ... }` block syntax. Updated them to the current Helm provider v3 `kubernetes = { ... }` object syntax.
- The EKS assumed-role note only mentioned the `aws-auth` ConfigMap, which AWS now documents as deprecated. Updated it to recommend EKS access entries first and mention `aws-auth` only as the legacy option.
- The service account token Secret example did not wait for the token controller to populate the Secret. Added `wait_for_service_account_token = true`, matching the Terraform Kubernetes provider's service-account-token example.
- The Kubernetes 1.24+ service account token wording implied the Secret type itself was new. Updated it to clarify that explicit long-lived token Secrets are required from Kubernetes 1.24 onward because automatic long-lived token Secret creation was removed.
- The GKE troubleshooting command used `--region`, which only applies to regional clusters. Updated it to `--location`, which the gcloud reference recommends for both regional and zonal clusters.
- The GKE Workload Identity section wording could imply GKE Workload Identity itself authenticates Terraform to the Kubernetes API. Tightened it to describe CI/CD environments that authenticate to Google Cloud with Workload Identity Federation and then use exec-based GKE authentication.

## Review Notes
- The EKS `exec` examples keep `client.authentication.k8s.io/v1beta1` because the current AWS CLI `aws eks get-token` documented output still uses that ExecCredential API version.
- The examples remain illustrative and omit provider version constraints. Future updates could add explicit `required_providers` blocks to make syntax expectations unambiguous.
