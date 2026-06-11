# Validation Summary: How to Build Pull-Based Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (GitOps controller)
- Kubernetes
- Helm (for ArgoCD installation)
- Kustomize (base + overlays pattern)
- GitHub Actions (CI workflow)
- External Secrets Operator (secret management)
- Mermaid (diagrams)

## Sources Consulted
- ArgoCD official docs (Application CRD, syncPolicy, getting started, Helm chart): https://argo-cd.readthedocs.io/
- argo-helm chart values reference (`configs.params`, `server.insecure`): https://github.com/argoproj/argo-helm/tree/main/charts/argo-cd
- Kustomize reference (`patches`, `images`, `kustomization.yaml` schema): https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/
- Kustomize patch type definition (api/types/patch.go): https://github.com/kubernetes-sigs/kustomize
- `kustomize edit set image` command reference: https://kubectl.docs.kubernetes.io/references/kustomize/cmd/
- External Secrets Operator API reference (ExternalSecret v1beta1): https://external-secrets.io/
- Kubernetes Deployment v1 API reference: https://kubernetes.io/docs/reference/
- GitHub Actions `actions/checkout@v4` reference: https://github.com/actions/checkout

## Issues Found
- **Kustomize `patches:` field used the deprecated string-list shorthand.** The post originally wrote:
  ```yaml
  patches:
    - replica-patch.yaml
  ```
  In current Kustomize, the unified `patches:` field requires each entry to be a structured object with a `path:` (or `patch:`) key. The bare-string form is only valid under the older, deprecated `patchesStrategicMerge:` field. Updated to:
  ```yaml
  patches:
    - path: replica-patch.yaml
  ```
  This is the correct schema per the Kustomize `Patch` type definition and is required for Kustomize to parse the kustomization.yaml successfully.

## Review Notes
- The ExternalSecret example uses `apiVersion: external-secrets.io/v1beta1`. External Secrets Operator has since stabilized a `v1` API (ESO 0.10+), but `v1beta1` is still supported by current releases, so this is not incorrect — just slightly behind the latest stable API. Future revisions could move to `external-secrets.io/v1`.
- The `--set configs.params."server\.insecure"=true` flag is the correct way to set the `server.insecure` ArgoCD param via the argo-cd Helm chart's `configs.params` map (escaped dot inside the key).
- The `argocd-initial-admin-secret` name, `password` data key, port-forward `8080:443` mapping, and `argocd login --insecure` are all current and correct.
- The ArgoCD `Application` CRD (`argoproj.io/v1alpha1`), `syncPolicy.automated` with `prune`/`selfHeal`, and `syncOptions: - CreateNamespace=true` all match the current CRD schema.
- The `kustomize edit set image registry.example.com/myapp:${{ github.sha }}` syntax correctly updates the tag for the image named `registry.example.com/myapp`.
- The base/deployment.yaml referenced in the directory tree contains a `configmap.yaml` entry that isn't shown — this is fine since the tree is illustrative.
- `base64 -d` works on GNU coreutils (Linux); macOS users need `-D`. The post targets a Linux/typical-CI context, so this is acceptable.
