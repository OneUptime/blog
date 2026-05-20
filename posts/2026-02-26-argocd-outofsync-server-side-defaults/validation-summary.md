# Validation Summary: How to Handle ArgoCD OutOfSync Due to Server-Side Defaults

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Kubernetes manifests
- Argo CD diff customization
- Argo CD Server-Side Diff

## Sources Consulted
- Argo CD Diff Strategies: https://argo-cd.readthedocs.io/en/release-2.12/user-guide/diff-strategies/
- Argo CD Diffing Customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD `argocd app manifests` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_manifests/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/

## Issues Found
- Corrected the Server-Side Diff version from Argo CD v2.5+ to v2.10+. Argo CD documents Structured-Merge Diff as beta since v2.5.0, while Server-Side Diff is beta since v2.10.0.
- Clarified the Server-Side Diff explanation. It uses Server-Side Apply in dry-run mode to generate the predicted live object and compare that with the actual live object.
- Added the documented requirement to restart `argocd-application-controller` after enabling `controller.diff.server.side` globally in `argocd-cmd-params-cm`.
- Added `spec.project` and `spec.destination` to the Application example so it is a complete, usable Argo CD Application manifest.
- Added the required Deployment `spec.selector` and matching pod template labels to the Kubernetes Deployment example. `apps/v1` Deployments require a selector, and the selector must match the pod template labels.
- Reworded the `resources.requests` example to attribute those fields to LimitRange or admission webhook behavior rather than ordinary Kubernetes API defaulting.

## Review Notes
The global Service ignore example is technically valid, but should be used carefully because ignoring `clusterIP` and `clusterIPs` can hide intentional changes for Services where those fields are explicitly managed. The local `argocd` CLI was not installed, so command verification was performed against the official Argo CD command reference. YAML snippets were parsed successfully with PyYAML.
