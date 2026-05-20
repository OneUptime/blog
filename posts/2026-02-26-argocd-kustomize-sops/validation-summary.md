# Validation Summary: How to Manage Secrets with ArgoCD and Kustomize SOPS

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Kustomize
- KSOPS
- SOPS
- age
- Kubernetes Secrets
- Docker
- GitHub Actions

## Sources Consulted
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/
- Argo CD v3.4.1 release notes: https://github.com/argoproj/argo-cd/releases/tag/v3.4.1
- KSOPS README and Argo CD integration notes: https://github.com/viaduct-ai/kustomize-sops
- KSOPS v4.5.1 release notes: https://github.com/viaduct-ai/kustomize-sops/releases/tag/v4.5.1
- SOPS README: https://github.com/getsops/sops
- SOPS v3.13.0 release notes: https://github.com/getsops/sops/releases/tag/v3.13.0
- age README and age-keygen usage: https://github.com/FiloSottile/age
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- GitHub Actions workflow syntax and checkout documentation: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions and https://github.com/actions/checkout

## Issues Found
- The repo-server setup installed KSOPS but did not enable Kustomize exec plugins in Argo CD. Added the required `argocd-cm` `kustomize.buildOptions` configuration with `--enable-alpha-plugins --enable-exec`, matching KSOPS and Argo CD documentation.
- The KSOPS download URL used the old repository/name pattern and would not resolve for the current release asset. Updated it to the official `viaduct-ai/kustomize-sops` release URL and current tarball naming.
- The SOPS encryption examples used an input filename that would not reliably match the environment-specific `.sops.yaml` `path_regex` rules. Added `--filename-override overlays/production/secret.enc.yaml` so SOPS selects the intended creation rule.
- The JSON6902 patch appended to `/envFrom/-`, which fails when the target container does not already define `envFrom`. Changed the patch to add the complete `envFrom` list.
- The Dockerfile and CI examples used older pinned versions. Updated Argo CD to `v3.4.1`, KSOPS to `v4.5.1`, and SOPS to `v3.13.0`.
- The GitHub Actions commit example did not configure a Git committer identity. Added `git config user.name` and `git config user.email` before committing.
- The troubleshooting command printed the first line of the mounted age private key. Replaced it with a non-disclosing `test -s` check.

## Review Notes
The overall approach is technically sound: KSOPS can be used as a Kustomize exec plugin with SOPS-encrypted Kubernetes Secret manifests, and Argo CD can run it when the repo server has the binary, decryption key, and Kustomize build options configured. The examples assume an amd64 repo-server image; arm64 installations would need matching binary downloads.
