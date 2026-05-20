# Validation Summary: How to Use kubeval and kubeconform to Validate Manifests Before ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes manifests and schemas
- kubeval
- kubeconform
- Helm
- Kustomize
- GitHub Actions
- GitLab CI

## Sources Consulted
- kubeconform README and CLI help: https://github.com/yannh/kubeconform
- kubeval README and CLI help: https://github.com/instrumenta/kubeval
- Kubernetes JSON Schema repository README: https://github.com/yannh/kubernetes-json-schema
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Helm `helm template` command reference: https://helm.sh/docs/helm/helm_template/
- Kubernetes `kubectl kustomize` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Datree CRDs catalog: https://github.com/datreeio/CRDs-catalog

## Issues Found
- The comparison table said kubeval only supports built-in schemas. kubeval supports a custom schema location and additional schema locations, so the table now says "Default/custom schema location" for kubeval and "Multiple sources" for kubeconform.
- The comparison table described kubeconform CRD support as simply "Full." kubeconform validates CRDs when schemas are supplied, so this now says "Full with external schemas."
- The output format row omitted kubeconform's current `text` and `pretty` formats and kubeval's default `stdout` format. The table now matches the documented CLI options.
- The Kubernetes version range row implied a precise kubeval support ceiling. Because kubeval is unmaintained while schema availability can vary by schema source, the row now avoids the unsupported fixed "Up to 1.24" claim.
- The Linux and GitHub Actions install snippets extracted into `/usr/local/bin` without elevated privileges. The commands now use `sudo tar` where needed.
- The "Skip unknown resource types" example used `-skip CustomResourceDefinition`, which skips CRD objects rather than custom resources with missing schemas. It now uses `-ignore-missing-schemas`, which is the kubeconform flag for continuing when schemas are unavailable.

## Review Notes
The remaining examples use valid kubeconform, Helm, Kustomize, and Argo CD command patterns. The CRD catalog URL format and local schema template were spot-checked against an Argo CD Application schema.
