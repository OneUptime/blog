# Validation Summary: How to Bootstrap ArgoCD with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Amazon EKS
- Terraform
- Terraform AWS, Helm, Kubernetes, and Argo CD providers
- Helm

## Sources Consulted
- HashiCorp Terraform Kubernetes provider documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs
- HashiCorp Terraform Helm provider documentation: https://registry.terraform.io/providers/hashicorp/helm/latest/docs
- Argo CD Terraform provider documentation and migration notes: https://github.com/argoproj-labs/terraform-provider-argocd
- Argo CD Terraform provider registry documentation: https://registry.terraform.io/providers/argoproj-labs/argocd/latest/docs
- terraform-aws-modules EKS module documentation: https://github.com/terraform-aws-modules/terraform-aws-eks
- Amazon EKS Kubernetes version lifecycle documentation: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- AWS CLI `eks get-token` documentation: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/eks/get-token.html
- Argo Helm chart documentation and releases: https://github.com/argoproj/argo-helm
- Argo CD admin password FAQ: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD ingress documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/ingress/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/auto_sync/

## Issues Found
- The Argo CD Terraform provider source used the old `oboukili/argocd` namespace. Updated it to `argoproj-labs/argocd` and bumped the version constraint to `~> 7.15`, matching the provider migration notes and current registry source.
- The EKS module example used older v19 arguments and an EKS Kubernetes version that is no longer in standard support. Updated the module to v21 syntax with `name` and `kubernetes_version`, set Kubernetes to `1.35`, and added cluster creator admin permissions so the Terraform identity can create bootstrap Kubernetes resources.
- The Helm chart version was outdated. Updated the Argo CD chart version from `5.55.0` to `9.5.14`.
- The Argo CD provider used `var.argocd_admin_password`, but the Helm install did not set that password in Argo CD. Added Helm chart values for the bcrypt admin password hash and password modification time, plus corresponding variables.
- The Argo CD provider used port forwarding while the Helm values set `server.insecure = true`. Added `plain_text = true`, as required by the provider when port-forwarding to a plain HTTP Argo CD API server.
- The Argo CD provider relied on ambient Kubernetes configuration for port forwarding. Added an explicit nested `kubernetes` provider configuration using the EKS endpoint, CA data, and AWS CLI exec authentication.

## Review Notes
- The examples remain illustrative because the post assumes an existing VPC module, tfvars files, DNS, ingress controller, and TLS certificate automation.
- The AWS CLI `eks get-token` examples still return `client.authentication.k8s.io/v1beta1`, so the Terraform provider exec blocks were left on `v1beta1`.
