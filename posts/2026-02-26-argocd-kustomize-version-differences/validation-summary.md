# Validation Summary: How to Handle Kustomize Version Differences in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kustomize
- Kubernetes
- kubectl
- GitHub Actions
- Docker
- asdf

## Sources Consulted
- Argo CD Kustomize user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD `argocd version` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_version/
- Argo CD release branch tool versions: https://github.com/argoproj/argo-cd/blob/release-2.7/hack/tool-versions.sh, https://github.com/argoproj/argo-cd/blob/release-2.8/hack/tool-versions.sh, https://github.com/argoproj/argo-cd/blob/release-2.9/hack/tool-versions.sh, https://github.com/argoproj/argo-cd/blob/release-2.10/hack/tool-versions.sh, https://github.com/argoproj/argo-cd/blob/release-2.11/hack/tool-versions.sh
- Kustomize v4.1.0 release notes for `labels`, `helmCharts`, and `--enable-helm`: https://github.com/kubernetes-sigs/kustomize/releases/tag/kustomize%2Fv4.1.0
- Kustomize source for `components` and `replacements` fields: https://github.com/kubernetes-sigs/kustomize/blob/kustomize/v3.7.0/api/types/kustomization.go and https://github.com/kubernetes-sigs/kustomize/blob/kustomize/v4.2.0/api/types/kustomization.go
- Kustomize v5.0.0 release notes for deprecated fields including `vars`: https://github.com/kubernetes-sigs/kustomize/releases/tag/kustomize%2Fv5.0.0
- Kubernetes `kubectl version` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes `kubectl kustomize` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
- The Argo CD to bundled Kustomize version table listed versions that do not match the official Argo CD 2.7-2.11 release branch tool-version files. Updated the table to 5.0.1, 5.1.0, and 5.2.1 as appropriate.
- The local installation and CI examples used Kustomize v5.3.0, which did not match the corrected Argo CD version table. Changed those examples to v5.2.1.
- The custom repo server Dockerfile attempted to save a `.tar.gz` archive directly as `/usr/local/bin/kustomize` while also piping to `tar`, and it assumed `curl` was already installed in the Argo CD image. Changed the command to install `curl` and `ca-certificates`, then stream the archive to `tar xz -C /usr/local/bin/`.
- The replacements feature was labeled as v4.5.0+. Kustomize source shows the `replacements` field present in v4.2.0, so the heading was corrected to v4.2.0+.
- The post said `argocd version` includes tool versions when checking Kustomize. Official Argo CD CLI docs describe it as client/server version output, so the section now uses the repo-server `kustomize version` command as the reliable Kustomize check.
- The post described `v1beta1` Kustomization as deprecated. Kustomize v5.0.0 release notes deprecate specific fields such as `vars`, not the `v1beta1` Kustomization API itself, so this was corrected.
- The `--load-restrictor LoadRestrictionsNone` description said it was needed for remote bases. Clarified that it is for loading local files outside the kustomization root.
- The components section said old versions could silently fail. Updated this to say they fail during the build, which is the expected behavior for an unsupported field.

## Review Notes
The post is now technically accurate for the Argo CD 2.7-2.11 range it discusses. Future updates should re-check Argo CD's `hack/tool-versions.sh` for the specific Argo CD release being documented, because bundled tool versions can change between release lines.
