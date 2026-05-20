# Validation Summary: How to Get ArgoCD to Recognize New Files in a Directory

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes manifests
- GitOps
- Kustomize
- Helm
- Jsonnet
- kubectl
- Git

## Sources Consulted
- Argo CD Directory user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD Declarative Setup, minimal Application spec: https://argo-cd.readthedocs.io/en/release-2.4/operator-manual/declarative-setup/
- Argo CD FAQ, repository polling and reconciliation timeout: https://argo-cd.readthedocs.io/en/release-3.4/faq/
- Argo CD Webhook Configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/webhook/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_get/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-2.13/user-guide/commands/argocd_app_manifests/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/helm/

## Issues Found
- The full Argo CD `Application` YAML examples omitted `spec.destination`. Argo CD's minimal declarative Application examples include a source and destination, and destination is needed for a usable Application. Added a destination block to the complete Application snippets.
- The post claimed Argo CD supports `.argocd-allow` and `.argocd-deny` files in the application source directory. I could not verify this in Argo CD official documentation, and the documented file-level skip mechanism is the `# +argocd:skip-file-rendering` directive. Replaced that section with the supported skip directive and a matching grep command.

## Review Notes
- The directory source behavior, recursive detection setting, include/exclude glob fields, hard refresh command, reconciliation timing, webhook explanation, Kustomize behavior, Helm values-file note, `argocd app manifests --source`, `argocd app diff`, and automated sync/prune configuration are consistent with the official Argo CD documentation consulted.
