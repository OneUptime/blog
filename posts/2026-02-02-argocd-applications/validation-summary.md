# Validation Summary: How to Create ArgoCD Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (Application CRD, AppProject, Notifications)
- GitOps
- Kubernetes (custom resources, manifests, namespaces)
- Helm (charts, values, parameters)
- Kustomize (overlays, images, commonLabels, namePrefix)
- ArgoCD CLI (`argocd app create/list/get/resources`)
- kubectl
- Slack notifications integration

## Sources Consulted
- ArgoCD official documentation: https://argo-cd.readthedocs.io/en/stable/
- ArgoCD Application CRD reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm/
- ArgoCD User Guide — Auto Sync, Sync Options, Sync Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- ArgoCD Helm integration: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- ArgoCD Kustomize integration: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- ArgoCD Multiple Sources: https://argo-cd.readthedocs.io/en/stable/user-guide/multiple_sources/
- ArgoCD Projects: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- ArgoCD Notifications: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- ArgoCD CLI reference (`argocd app create --help`): https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_create/

## Issues Found
No technical issues found. All code samples, CLI commands, CRD field names, and configuration snippets match the current ArgoCD Application/AppProject/Notifications specifications.

## Review Notes
- The Kustomize section uses `commonLabels`. While Kustomize itself (in `kustomization.yaml`) deprecated `commonLabels` in favor of `labels` (kustomize v5+), ArgoCD's Application `spec.source.kustomize.commonLabels` field is still the correct, supported name in the ArgoCD CRD — no change needed.
- The "Pin Versions in Production" snippet contains two `targetRevision` keys in the same `source` block. They are clearly presented as alternatives via comments ("Or use a release branch"), but as literal YAML the second key would override the first. This is a common documentation pattern (showing options) rather than a copy-paste-ready manifest; leaving as-is because the intent is unambiguous from the surrounding comments.
- The `PrunePropagationPolicy=foreground` comment ("Prune resources in the correct order based on dependencies") slightly conflates dependency ordering with Kubernetes' foreground cascade deletion semantics. Technically the option controls the garbage-collection cascade, not sync ordering — but the comment is close enough not to mislead in this context.
- The `--sync-policy automated` CLI flag enables automated sync but does not by itself enable `--auto-prune` or `--self-heal`; users wanting prune/self-heal via CLI need those additional flags. The example does not claim otherwise.
- Version-specific note: example uses `ingress-nginx` chart `4.9.0` and `release/1.2` / `v1.2.3` placeholders. These are illustrative versions, not claims about latest releases, so no accuracy concern.
