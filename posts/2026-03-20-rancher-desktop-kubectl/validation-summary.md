# Validation Summary: How to Use kubectl with Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- `kubectl`
- Kubernetes
- k3s
- `nerdctl`
- Docker / Moby
- Helm
- Bitnami Helm charts

## Sources Consulted
- Rancher Desktop installation docs: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Kubernetes preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop container engine preferences: https://docs.rancherdesktop.io/ui/preferences/container-engine/general/
- Rancher Desktop application environment / PATH docs: https://docs.rancherdesktop.io/ui/preferences/application/environment
- Rancher Desktop troubleshooting docs: https://docs.rancherdesktop.io/ui/troubleshooting
- Rancher Desktop air-gapped guide (`rancher-desktop` Kubernetes context examples): https://docs.rancherdesktop.io/how-to-guides/running-air-gapped
- Rancher Desktop bundled utilities reference: https://docs.rancherdesktop.io/references/bundled-utilities/
- Rancher Desktop maintainer discussion on log/data paths: https://github.com/rancher-sandbox/rancher-desktop/discussions/1551
- Rancher Desktop 1.20.0 release notes (`rdctl reset` replacing deprecated `rdctl factory-reset`): https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.20.0
- Rancher Desktop 1.21.0 release notes (`rdctl info`): https://github.com/rancher-sandbox/rancher-desktop/releases/tag/v1.21.0
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm usage documentation: https://docs.helm.sh/docs/intro/using_helm/
- Bitnami Helm chart repository documentation: https://docs.bitnami.com/kubernetes/faq/get-started/understand-charts-release-process/
- Bitnami NGINX chart page: https://bitnami.com/stack/nginx/helm

## Issues Found
- The prerequisites were too broad for current Rancher Desktop support. I updated them to match the current supported host platforms and requirements, including WSL2 on Windows and `/dev/kvm` access on Linux, and aligned the RAM/CPU guidance with current documentation.
- The `kubectl` examples did not ensure the `rancher-desktop` context was active, so they could target the wrong Kubernetes cluster on a machine with multiple contexts. I added `kubectl config use-context rancher-desktop` before the cluster checks.
- The post used `rdctl status`, which is not a current Rancher Desktop CLI command. I replaced it with `rdctl info`, which is the current command for basic Rancher Desktop information.
- The post used `rdctl factory-reset`, which Rancher Desktop has kept only as a deprecated hidden command after introducing `rdctl reset`. I replaced it with the current `rdctl reset --factory` form.
- The command `rdctl list-settings | grep kubernetesVersion` was incorrect for current Rancher Desktop output and did not actually list available Kubernetes versions. I replaced it with `rdctl list-settings` and adjusted the wording accordingly.
- The troubleshooting command `rdctl list-settings | grep -i vm` was not reliable for current settings output. I replaced it with `rdctl list-settings`.
- The log-path section had an incorrect macOS path and a malformed Windows/Linux line. I corrected the paths and formatting.
- The `rdctl set --kubernetes-version` examples used stale example versions and older version formatting. I refreshed them to current syntax and updated the example version.

## Review Notes
- `rdctl` is still documented as experimental by Rancher Desktop, so command names and flags can change between releases.
- The Helm section is technically valid. Bitnami also publishes OCI-based chart install instructions now, but the repo-based `helm repo add ...` and `helm install bitnami/nginx` flow remains valid.
- The container examples are runtime-specific: `nerdctl` applies to the `containerd` engine, while `docker` applies to the Moby/dockerd engine.
