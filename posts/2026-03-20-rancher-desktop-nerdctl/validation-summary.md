# Validation Summary: How to Use nerdctl with Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- `nerdctl`
- containerd
- Kubernetes
- `kubectl`
- Helm
- Moby / `dockerd`

## Sources Consulted
- Rancher Desktop introduction: https://docs.rancherdesktop.io/
- Rancher Desktop installation requirements: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Testcontainers guide, used to confirm current dotted `rdctl set` flag syntax: https://docs.rancherdesktop.io/how-to-guides/using-testcontainers
- Rancher Desktop releases page, used to confirm current `rdctl info` behavior and the `rdctl reset` command family: https://github.com/rancher-sandbox/rancher-desktop/releases
- Rancher Desktop maintainer discussion on platform storage and log locations: https://github.com/rancher-sandbox/rancher-desktop/discussions/1551
- `nerdctl` command reference: https://github.com/containerd/nerdctl/blob/main/docs/command-reference.md
- `nerdctl` project README: https://github.com/containerd/nerdctl
- Kubernetes `kubectl create deployment`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm docs home: https://helm.sh/docs/
- Bitnami charts repository: https://github.com/bitnami/charts

## Issues Found
- The prerequisites overstated some requirements and omitted a Windows-specific prerequisite. I changed them to use supported OS wording, added the WSL2 requirement for Windows, changed admin access to "may be required", and aligned RAM/CPU guidance with Rancher Desktop's documented recommendations.
- The `rdctl` configuration examples used outdated or incorrect flag forms such as `--kubernetes-version` and `--container-engine`. I updated them to current dotted settings syntax: `rdctl set --container-engine.name=containerd` and `rdctl set --kubernetes.version=<supported-version>`.
- The post mixed `docker` commands into a `nerdctl`/containerd workflow. I removed the `docker version` and `docker pull` alternatives because Rancher Desktop documents `docker` usage for the Moby engine and `nerdctl` usage for the containerd engine.
- The "Common Configuration Tasks" section used incorrect or outdated `rdctl` commands. I replaced `rdctl status` with `rdctl info`, replaced the reset example with `rdctl reset --k8s`, replaced the invalid `list-settings | grep kubernetesVersion` example with `rdctl list-settings`, and corrected the Kubernetes version update command.
- The troubleshooting section had malformed log path formatting and used an outdated factory reset invocation. I fixed the platform log paths and replaced `rdctl factory-reset` with `rdctl reset --factory`.

## Review Notes
- Rancher Desktop's current documentation is internally mixed: some `rdctl` reference examples still show legacy flag forms, while current help output and newer official guides use dotted setting paths such as `--container-engine.name` and `--kubernetes.version`. The post now follows the current syntax.
- `nerdctl` uses containerd namespaces that are separate from Kubernetes namespaces. This post deploys `nginx:latest` directly from the registry for Kubernetes, so it remains technically correct, but a future revision could mention that locally pulled images are not automatically visible to Kubernetes unless the `k8s.io` containerd namespace is used.
