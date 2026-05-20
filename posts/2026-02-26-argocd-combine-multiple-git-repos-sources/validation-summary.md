# Validation Summary: How to Combine Multiple Git Repos as Application Sources in ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD Applications
- Argo CD multi-source configuration
- Argo CD CLI
- Git repository authentication
- Kubernetes manifests
- Kubernetes sync ordering with Argo CD sync waves
- Kubernetes Pod Security Admission
- Git webhooks

## Sources Consulted
- Argo CD official documentation: Multiple Sources for an Application - https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- Argo CD official documentation: Sync Phases and Waves - https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD official command reference: argocd repo add - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD official command reference: argocd app resources - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD official command reference: argocd app diff - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD official command reference: argocd app get - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD official documentation: Private Repositories - https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD official documentation: Webhook Configuration - https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD official FAQ: repository polling interval - https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Kubernetes official documentation: PodSecurityPolicy - https://kubernetes.io/docs/concepts/policy/pod-security-policy/
- Kubernetes official documentation: Pod Security Admission - https://kubernetes.io/docs/concepts/security/pod-security-admission/

## Issues Found
- The post listed PodSecurityPolicies as current security-team resources. PodSecurityPolicy was deprecated in Kubernetes v1.21 and removed in v1.25, so this was changed to Pod Security Admission labels.
- The post stated that four separate Argo CD Applications were required before multi-source. That was too absolute because other coordination patterns can exist, so it was changed to "often needed".
- The SSH authentication examples used HTTPS repository URLs with `--ssh-private-key-path`. Argo CD documents SSH private-key authentication with SSH-style repository URLs, so the examples were changed to `git@github.com:your-org/...`.
- The post said every repository must be registered with Argo CD. Public repositories may not need private credentials, so this was narrowed to private repositories needing to be accessible to Argo CD.
- The `argocd app resources` command was described as grouping resources by source, which is not what the official command reference documents. The description was changed to "View application resources".
- The `argocd app diff` command was described as identifying which source caused an OutOfSync state. The command performs live-vs-target diffs, so the description was changed to "Inspect live vs desired differences".

## Review Notes
The core multi-source `spec.sources` examples, independent `targetRevision` usage, sync-wave annotation, hard refresh command, webhook endpoint guidance, and default polling interval are consistent with the official Argo CD documentation. The guide intentionally uses placeholder repositories and example paths, so repository existence was not treated as a validation requirement.
