# Validation Summary: How to Switch Between containerd and dockerd in Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- `containerd`
- `dockerd` / Moby
- `nerdctl`
- Docker CLI
- Kubernetes / `kubectl`
- Helm

## Sources Consulted
- Rancher Desktop Docs, Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Docs, Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop Docs, Container Engine > General: https://docs.rancherdesktop.io/ui/preferences/container-engine/general/
- Rancher Desktop Docs, Kubernetes preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop Docs, Working with Images: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop Docs, Command Reference: `rdctl`: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Docs, Troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop release notes v1.20.0 (`rdctl reset` and `rdctl factory-reset` deprecation): https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.20.0
- Rancher Desktop release notes v1.21.0 (`rdctl info`): https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.21.0
- Rancher Desktop maintainer discussion on platform data/log locations: https://github.com/rancher-sandbox/rancher-desktop/discussions/1551
- Kubernetes docs, `kubectl cluster-info`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/
- Kubernetes docs, `kubectl create deployment`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes docs, `kubectl expose`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes docs, `kubectl port-forward`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm docs, Using Helm: https://docs.helm.sh/docs/intro/using_helm/
- Bitnami chart repository index (`nginx` chart present): https://charts.bitnami.com/bitnami/index.yaml

## Issues Found
- The post used `rdctl factory-reset` as the primary reset command. I replaced it with `rdctl reset --factory` because Rancher Desktop now documents `rdctl reset` as the current command and marks `rdctl factory-reset` as deprecated and hidden.
- The post used `rdctl status`, which is not a current `rdctl` command. I replaced it with `rdctl info`, which is the current command for checking Rancher Desktop runtime information.
- The post claimed `rdctl list-settings | grep kubernetesVersion` lists available Kubernetes versions. That command only shows current settings, so I changed the example and description to reflect current settings instead of available versions.
- The container workflow mixed `docker pull` with later `nerdctl`-only commands. Rancher Desktop documents that `nerdctl` is for the `containerd` runtime and `docker` is for the Moby runtime, so I added the matching Docker equivalents for run, list, logs, stop, and remove.
- The Kubernetes example used `kubectl port-forward ... &`, which depends on POSIX shell backgrounding and is not portable across Windows shells. I changed the instructions to run port forwarding in a separate terminal.
- The prerequisites overstated admin requirements and undocumented resource recommendations. I updated them to match current Rancher Desktop guidance: admin access may be required depending on installation path or privileged features, and `8 GB` RAM / `4 CPU` are recommendations.
- The `rdctl set --kubernetes-version` examples used version strings with a `v` prefix and older sample versions. I updated them to current syntax and a current documented example version.
- The troubleshooting section had a formatting bug in the log paths and used an incorrect macOS log directory name. I corrected the formatting and aligned the paths/wording with current Rancher Desktop documentation and maintainer guidance.

## Review Notes
- `rdctl` is still documented by Rancher Desktop as experimental, so command names, flags, and output may change between releases.
- The Helm example using `helm repo add bitnami ...` and `helm install my-release bitnami/nginx` is still valid, although Bitnami also highlights OCI-based installs in its current chart documentation.
