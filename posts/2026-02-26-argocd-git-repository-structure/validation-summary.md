# Validation Summary: How to Structure Your Git Repository for ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet CRDs
- GitOps repository structure
- Kubernetes manifests
- Kustomize
- Helm
- Sealed Secrets and External Secrets Operator

## Sources Consulted
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/
- Argo CD ApplicationSet Git generator documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Git/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD cluster bootstrapping and App of Apps documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-bootstrapping/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Helm `helm template` command reference: https://helm.sh/docs/v3/helm/helm_template/
- Kustomize official site: https://kustomize.io/
- Referenced OneUptime blog URL: https://oneuptime.com/blog/post/2026-02-26-argocd-send-metrics-oneuptime/view

## Issues Found
- The ApplicationSet Git directory generator example used older/non-current template expressions such as `{{path[1]}}` and `{{path}}`. Updated it to the current documented Go template form with `goTemplate: true`, `{{index .path.segments 1}}`, and `{{.path.path}}`.
- The `argocd app create` verification command used `--dry-run`, which is not listed in the current official `argocd app create` command reference. Removed the unsupported flag so the command uses documented options.

## Review Notes
- The local environment did not have `argocd`, `kustomize`, or `helm` installed, so CLI checks were performed against official documentation rather than local `--help` output.
- The `argocd app create` example now creates an Argo CD Application; users should delete the temporary test application after verification if they do not want to keep it.
