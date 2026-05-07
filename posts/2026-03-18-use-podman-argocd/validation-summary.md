# Validation Summary: How to Use Podman with ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Argo CD
- Kubernetes
- GitOps
- GitHub Actions
- GitHub Container Registry (GHCR)
- Kustomize
- kubectl
- Git

## Sources Consulted
- Podman build docs: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman login docs: https://docs.podman.io/en/v5.6.0/markdown/podman-login.1.html
- Podman push docs: https://docs.podman.io/en/stable/markdown/podman-push.1.html
- Argo CD automated sync docs: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD CLI docs for `argocd app get`: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_app_get/
- Argo CD CLI docs for `argocd app wait`: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_app_wait/
- Kubernetes Kustomize docs: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes Deployment docs: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- GitHub Packages with GitHub Actions docs: https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- GitHub-hosted runner image software list: https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md
- GitHub workflow commands docs for `GITHUB_ENV`: https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions

## Issues Found
- The GitOps update script executed both the direct `sed` manifest update and the Kustomize overlay update even though the text said the Kustomize path was an alternative. I changed the Kustomize lines into a true commented alternative so the example no longer performs mutually exclusive update strategies in one run.
- The GitHub Actions workflow pushed to GHCR using `GITHUB_TOKEN` but omitted the job permissions GitHub documents for package publishing. I added `contents: read` and `packages: write` under `permissions`.
- The GitHub Actions workflow used an image name derived directly from `${{ github.repository }}` and reused values written to `GITHUB_ENV` through `${{ env.* }}` in later shell steps. I updated the example to normalize the GHCR image name to lowercase and to consume `IMAGE_ID` and `VERSION` as environment variables in later `run` steps, which matches GitHub's documented `GITHUB_ENV` behavior.

## Review Notes
- GitHub-hosted `ubuntu-latest` currently includes both Podman and Kustomize, so the workflow does not need an explicit installation step as of 2026-05-07.
- The post's Argo CD Application points at a Kustomize overlay path. In repos that follow that pattern, updating the overlay is generally the safer manifest-update method.
