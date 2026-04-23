# Validation Summary: How to Use Rancher Desktop for Microservices Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- Kubernetes
- `kubectl`
- Helm
- `nerdctl`
- Docker / Moby
- k3s
- WSL2

## Sources Consulted
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` Command Reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Working with Images: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop VM Hardware settings: https://docs.rancherdesktop.io/ui/preferences/virtual-machine/hardware/
- Rancher Desktop Troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop releases and release notes: https://github.com/rancher-sandbox/rancher-desktop/releases
- Rancher Desktop discussion on storage and log locations: https://github.com/rancher-sandbox/rancher-desktop/discussions/1551
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm usage guide: https://helm.sh/docs/intro/using_helm/
- Helm command reference: https://docs.helm.sh/docs/helm/helm/
- Bitnami chart repository: https://charts.bitnami.com/

## Issues Found
- The metadata claimed the guide covered service meshes and API gateways, but the body did not. I removed the `Service Mesh` tag and corrected the description so it matches the actual content.
- The prerequisites were too broad and partially outdated. I updated them to reflect current Rancher Desktop support and installation requirements, including virtualization, WSL2 on Windows, and the current 8 GB RAM / 4 CPU recommendations from the official docs.
- The configuration section said the Preferences UI exposes VM CPU, memory, and disk allocation. Current Rancher Desktop docs show CPU and memory allocation in the VM hardware UI for macOS and Linux, while disk sizing is CLI-only. I corrected that description.
- The runtime examples mixed `nerdctl` and Docker in a way that could mislead readers. Rancher Desktop’s docs distinguish `nerdctl` for the `containerd` engine and Docker for the Moby engine, so I clarified the CLI checks and made the container workflow consistently use `nerdctl`.
- Several `rdctl` commands were outdated or incorrect for current Rancher Desktop documentation. I replaced `rdctl status` with `rdctl info`, changed the reset examples to `rdctl reset --k8s` and `rdctl reset --factory`, and updated the settings flags to current dotted forms such as `--kubernetes.version` and `--container-engine.name`.
- The post hard-coded older Kubernetes versions and implied they were universally available. I replaced those with a current example and added a note that readers must use a version available in their Rancher Desktop release.
- The troubleshooting log paths had a formatting bug and an incorrect macOS path capitalization. I fixed the paths and added the documented `Troubleshooting > Show Logs` route from the UI.

## Review Notes
- The `kubectl create deployment`, `kubectl expose`, `kubectl port-forward`, `helm repo add`, `helm repo update`, `helm install`, `helm list`, and `helm uninstall` examples are valid against current upstream documentation.
- The post is technically correct after the fixes, but it remains a general Rancher Desktop guide rather than a detailed microservices, service mesh, or API gateway walkthrough.
