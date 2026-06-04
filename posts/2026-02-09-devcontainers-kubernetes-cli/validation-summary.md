# Validation Summary: How to Build Devcontainers with Kubernetes CLI Tools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dev Containers / devcontainer.json
- Dockerfiles and Ubuntu package installation
- Kubernetes and kubectl
- Helm
- Kustomize
- kind
- k9s, kubectx, kubens, stern, yq
- Bash helper scripts
- pre-commit, kubeconform, yamllint, hadolint

## Sources Consulted
- Kubernetes kubectl Linux installation documentation: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- Kubernetes stable release endpoint: https://dl.k8s.io/release/stable.txt
- Kubernetes pkgs.k8s.io package repository announcement and apt examples: https://kubernetes.io/blog/2023/08/15/pkgs-k8s-io-introduction/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Dev Container specification reference: https://github.com/devcontainers/spec/blob/main/docs/specs/devcontainer-reference.md
- Dev Container Features registry: https://containers.dev/features
- VS Code Dev Containers documentation: https://code.visualstudio.com/docs/devcontainers/create-dev-container
- Helm installation documentation: https://helm.sh/docs/v3/intro/install/
- Kustomize project documentation: https://kustomize.io/
- kind quick start installation documentation: https://kind.sigs.k8s.io/docs/user/quick-start/
- kubeval repository maintenance notice: https://github.com/instrumenta/kubeval
- kubeconform installation documentation: https://kubeconform.mandragor.org/docs/installation/
- hadolint releases: https://github.com/hadolint/hadolint/releases
- stern releases: https://github.com/stern/stern/releases

## Issues Found
- The kubectl apt repository used Kubernetes v1.28, which is out of date for a 2026 tutorial. Updated the apt repository and signing-key URL to the current stable v1.36 line.
- The Dockerfile used `wget` later but did not install it. Added `wget` to the base package list.
- The Dockerfile used `pip` later but did not install Python packaging tools. Added `python3-pip` and changed script examples to use `python3 -m pip`.
- The Dockerfile installed `netcat`, which is a virtual package on Ubuntu and can fail in non-interactive apt installs. Replaced it with `netcat-openbsd`.
- The Dockerfile attempted to create the `vscode` user and group even though the Dev Containers base image commonly already includes them. Made user and group creation conditional.
- The kind install command pinned an outdated v0.20.0 binary. Updated it to the current kind quick-start version, v0.32.0.
- The stern install command pinned an outdated v1.28.0 binary. Updated it to v1.34.0.
- The devcontainer snippets used `ghcr.io/devcontainers/features/docker-in-docker:2`; the current Dev Container Features registry lists major version 3. Updated both examples to `docker-in-docker:3`.
- The post-create script used `kubectl version --short`, which is not listed in the current generated kubectl reference. Replaced it with `kubectl version`.
- The post-create script could fail under `set -e` if a project file existed but the matching runtime was not installed. Added `command -v` guards for Go, npm, and Python dependency installation.
- The `quick_deploy` helper exposed `nginx:latest` on target port 8080 by default even though the image listens on port 80. Added a separate `target_port` argument defaulting to 80.
- The validation setup used kubeval, whose repository states it is no longer maintained. Replaced it with kubeconform and updated the pre-commit hook entry.
- The hadolint install wrote to `/usr/local/bin` without sudo while running as the non-root user. Added sudo and updated the pinned hadolint release to v2.14.0.
- The pre-commit hook revisions for `pre-commit-hooks` and `yamllint` were outdated. Updated them to current releases.

## Review Notes
- The tutorial remains Linux amd64-focused. Multi-architecture installs for kind, stern, yq, and other downloaded binaries would be a useful future improvement.
- Several install commands still download and execute remote installer scripts or latest-release artifacts. That is common in tutorials, but production devcontainers should pin checksums or fixed versions for stronger reproducibility.
