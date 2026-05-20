# Validation Summary: What Does 'Desired State' Mean in ArgoCD?

## Status
validated

## Post Type
Conceptual guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubernetes Deployments
- Helm
- Kustomize
- Git

## Sources Consulted
- Argo CD Overview: https://argo-cd.readthedocs.io/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Directory user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Diff Customization user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Kubernetes Controllers concept documentation: https://kubernetes.io/docs/concepts/architecture/controller/
- Kubernetes Deployments concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Kustomize walkthrough's base Deployment defined `spec.selector.matchLabels.app: my-app` but omitted matching labels under `spec.template.metadata.labels`. In Kubernetes `apps/v1`, a Deployment selector must match the pod template labels, so the example would be invalid as written. Added `spec.template.metadata.labels.app: my-app` to make the manifest valid.

## Review Notes
- The post is technically accurate after the fix. Argo CD's handling of desired state, live state, Helm rendering with `helm template`, Kustomize rendering, pruning behavior, automated versus manual sync, and diff customization aligns with the official documentation.
- The plain-manifest explanation is accurate at a conceptual level. In practice, Argo CD directory applications load `.yml`, `.yaml`, and `.json` files from the configured path, and recursive detection must be explicitly enabled.
