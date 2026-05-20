# Validation Summary: How to Allow or Deny Specific Resource Kinds in ArgoCD Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD AppProjects
- Kubernetes API resources
- Kubernetes RBAC
- GitOps project security controls
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `argocd proj set` Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_set/
- Argo CD `argocd proj get` Command Reference: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/commands/argocd_proj_get/
- Kubernetes `kubectl api-resources` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/

## Issues Found
- The post incorrectly stated that there is no CLI shorthand for modifying resource whitelists. Argo CD documents project resource commands such as `argocd proj allow-namespace-resource`, `argocd proj allow-cluster-resource`, `argocd proj deny-namespace-resource`, and `argocd proj deny-cluster-resource`, as well as `argocd proj set` flags for resource lists. Updated the command example to show `argocd proj allow-namespace-resource web-team apps Deployment` and kept `kubectl edit` as a direct YAML-editing option.

## Review Notes
The AppProject resource fields, whitelist/blacklist behavior, wildcard examples, Kubernetes resource scopes, and `kubectl api-resources` troubleshooting command are consistent with the official documentation reviewed. The examples are intentionally partial AppProject snippets in some sections; they are valid as fragments but would need normal project fields such as sources and destinations in a complete production AppProject manifest.
