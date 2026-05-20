# Validation Summary: How to Use Custom Kustomize Binary with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes Deployments and ConfigMaps
- Docker
- Kustomize plugins

## Sources Consulted
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD Custom Tooling documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/custom_tools/
- Argo CD `argocd app manifests` command reference for v2.9: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_manifests/
- Kubernetes generated kubectl reference for Kustomize flags: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kustomize GitHub releases: https://github.com/kubernetes-sigs/kustomize/releases
- SopsSecretGenerator package documentation: https://pkg.go.dev/github.com/goabout/kustomize-sopssecretgenerator

## Issues Found
- The SopsSecretGenerator install example used a `.tar.gz` URL that does not exist and would return 404. Updated it to download the direct binary URL documented by the plugin project and added `chmod +x` so Kustomize can execute the plugin.

## Review Notes
- The Argo CD configuration keys for custom Kustomize versions, per-application `spec.source.kustomize.version`, and global or version-specific `kustomize.buildOptions` match official Argo CD documentation.
- The `argocd app manifests my-app --source git` command is valid for Argo CD v2.9.
- Argo CD v2.9.3 and Kustomize v5.4.1 are no longer current as of this review date, but the examples are version-pinned and remain technically valid for the versions discussed.
