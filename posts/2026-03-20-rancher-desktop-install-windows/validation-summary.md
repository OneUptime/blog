# Validation Summary: How to Install Rancher Desktop on Windows

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- Windows
- WSL2
- Kubernetes
- k3s
- kubectl
- Helm
- nerdctl
- Docker / Moby

## Sources Consulted
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop WSL integrations: https://docs.rancherdesktop.io/ui/preferences/wsl/integrations/
- Rancher Desktop v1.21.0 release notes (`rdctl info` and `rdctl reset` context): https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.21.0
- Kubernetes `kubectl create deployment`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm usage guide: https://docs.helm.sh/docs/intro/using_helm/
- Helm `repo add` reference: https://helm.sh/docs/v3/helm/helm_repo_add/
- nerdctl project README: https://github.com/containerd/nerdctl
- nerdctl command reference: https://github.com/containerd/nerdctl/blob/main/docs/command-reference.md
- Docker CLI `version`: https://docs.docker.com/reference/cli/docker/version/
- Docker CLI `image pull`: https://docs.docker.com/reference/cli/docker/image/pull/
- Bitnami NGINX chart: https://artifacthub.io/packages/helm/bitnami/nginx

## Issues Found
- The prerequisites were inaccurate for a Windows-specific Rancher Desktop guide. I replaced the cross-platform requirements with the current Windows requirements from Rancher Desktop docs, including Windows 11 or Windows Server 2025, WSL, virtualization, internet access, and the Privileged Service admin caveat.
- The overview and configuration section implied Windows users manage CPU, memory, and disk through a Rancher Desktop VM screen. I corrected this to match the WSL integration docs, which state CPU and memory allocation are managed globally by WSL on Windows.
- The `rdctl` examples included stale or incorrect commands. I replaced `rdctl status` with `rdctl info`, replaced `rdctl factory-reset` with `rdctl reset --k8s` and `rdctl reset --factory`, and replaced the invalid `rdctl list-settings | grep kubernetesVersion` example with `rdctl list-settings`.
- The Kubernetes version examples were hard-coded to specific old releases (`v1.28.0` and `v1.29.0`). I changed them to a supported-version placeholder because Rancher Desktop’s available Kubernetes versions vary by Rancher Desktop release.
- The troubleshooting log-path comment was malformed and not aligned with the current official docs. I replaced it with the documented UI path, `Troubleshooting > Show Logs`.
- The metadata tag `Window` was incorrect. I corrected it to `Windows`.

## Review Notes
- `rdctl info` is a newer command documented in current Rancher Desktop materials; older Rancher Desktop versions may not have it.
- `rdctl factory-reset` is still mentioned in older Rancher Desktop material, but Rancher Desktop 1.20 introduced `rdctl reset` and marked `rdctl factory-reset` as deprecated and hidden.
- The post is technically valid after the fixes, but it still reads more like post-install verification and usage than a full MSI installation walkthrough.
