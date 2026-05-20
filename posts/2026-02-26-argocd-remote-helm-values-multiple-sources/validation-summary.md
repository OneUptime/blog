# Validation Summary: How to Use Remote Helm Values Files with Multiple Sources in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD multi-source Applications
- Argo CD Helm integration
- Helm values files and value precedence
- Kubernetes Application manifests
- cert-manager Helm chart configuration
- Argo CD CLI

## Sources Consulted
- Argo CD documentation: Multiple Sources for an Application - https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD documentation: Helm - https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- Argo CD CLI documentation: `argocd app manifests` - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_manifests/
- Argo CD CLI documentation: `argocd app get` - https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_get/
- Helm documentation: `helm template` - https://helm.sh/docs/v3/helm/helm_template/
- cert-manager v1.14 documentation: Installing with Helm - https://cert-manager.io/v1.14-docs/installation/helm/

## Issues Found
No technical issues found.

## Review Notes
The post accurately describes Argo CD's multi-source `ref` behavior for external Helm values files, including root-relative `$ref` paths, ref-only sources, and using `ref` with `path`. The Helm value precedence order and multiple `valueFiles` merge behavior match the Argo CD Helm documentation. The Argo CD CLI examples use valid commands and flags. The cert-manager example uses the documented `installCRDs` value for the v1.14 chart version shown in the post.
