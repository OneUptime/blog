# Validation Summary: How to Override Kustomize Name Prefix in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet manifests
- Kubernetes
- Kustomize
- YAML

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD `argocd app unset` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_unset/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_manifests/
- Kustomize `namePrefix` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/nameprefix/
- Kustomize `replacements` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/replacements/
- Kustomize kustomization file reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/

## Issues Found
- The example `apps/v1` Deployment omitted `spec.selector` and matching pod template labels, which are required for a valid Deployment. Added `spec.selector.matchLabels` and `spec.template.metadata.labels` to the input and rendered-output examples.
- The text said a Service references a Deployment by name. Standard Kubernetes Services select pods by labels, and Kustomize name-prefix reference handling applies to supported name-reference fields. Changed the example explanation to a Deployment referencing a ConfigMap.
- The repeated Argo CD Application examples omitted required source and destination context. Added `project`, `repoURL`, `targetRevision`, and `destination.server` so the examples are complete.
- The Argo CD CLI examples used the non-current `--kustomize-name-prefix` flag. Replaced it with the documented `--nameprefix` flag.
- The CLI removal example set an empty prefix with `argocd app set`. Replaced it with the documented `argocd app unset ... --nameprefix` command.
- The ApplicationSet template omitted `project` and `targetRevision`. Added both to keep the generated Applications complete.
- The reference-handling list claimed `spec.selector.matchLabels` is updated by `namePrefix`. Removed that claim because namePrefix updates resource names and supported name references, not arbitrary selector labels.
- The post referred to "Custom resource definitions (CRDs) with custom fields" when the issue is custom resource fields referencing resource names. Changed this to "Custom resources with custom fields."

## Review Notes
No further issues found. Kustomize can support additional custom name references through transformer configuration, but the post's recommendation to use `replacements` for explicit custom field mapping is technically valid for the example use case.
