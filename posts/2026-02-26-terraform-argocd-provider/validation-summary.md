# Validation Summary: How to Use Terraform ArgoCD Provider

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform ArgoCD provider
- Argo CD
- GitOps
- Kubernetes
- Helm and OCI repositories
- AWS Secrets Manager

## Sources Consulted
- Terraform ArgoCD provider README and migration notes: https://github.com/argoproj-labs/terraform-provider-argocd
- Terraform ArgoCD provider documentation: https://registry.terraform.io/providers/argoproj-labs/argocd/latest/docs
- Terraform ArgoCD `argocd_application` resource documentation: https://registry.terraform.io/providers/argoproj-labs/argocd/latest/docs/resources/application
- Terraform ArgoCD `argocd_project` resource documentation: https://registry.terraform.io/providers/argoproj-labs/argocd/latest/docs/resources/project
- Terraform ArgoCD `argocd_repository` resource documentation: https://registry.terraform.io/providers/argoproj-labs/argocd/latest/docs/resources/repository
- Terraform ArgoCD `argocd_cluster` resource documentation: https://registry.terraform.io/providers/argoproj-labs/argocd/latest/docs/resources/cluster
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Terraform provider requirements documentation: https://developer.hashicorp.com/terraform/language/providers/requirements

## Issues Found
- The provider source used the old `oboukili/argocd` namespace and a `~> 6.0` version constraint. Updated it to `argoproj-labs/argocd` and `~> 7.15`, matching the current provider namespace and latest documented 7.x release line.
- The core mode comment said "no API server", which could imply no local API server is involved. Updated it to "no remote ArgoCD API server" to match the provider documentation.
- The developer project role was described as read-only while also granting `applications sync`. Updated the description to avoid contradicting the RBAC policy.
- The application sync retry example used numeric values for `limit` and `factor`, while the current provider schema documents these fields as strings. Updated them to quoted string values.
- The OCI repository example used `type = "helm"` with `enable_oci = true` while also using an `oci://` repository URL. Updated it to the current provider-documented OCI repository form with `type = "oci"`.
- The import examples for applications and projects used incorrect IDs. Updated application import to `{name}:{namespace}` and project import to the project name only.

## Review Notes
The remaining examples align with the current Terraform ArgoCD provider schema and Argo CD concepts. The examples use placeholder domains, repository URLs, tokens, and cluster endpoints, so they still require real environment-specific values before use.
