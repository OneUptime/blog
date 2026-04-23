# Validation Summary: How to Switch Between Kubernetes Versions in Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- Kubernetes
- `rdctl`
- `kubectl`
- `nerdctl`
- Docker/Moby
- Helm

## Sources Consulted
- Rancher Desktop Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop Kubernetes preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop Container Engine preferences: https://docs.rancherdesktop.io/ui/preferences/container-engine/general
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting/
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm Using Helm guide: https://docs.helm.sh/docs/intro/using_helm/
- Bitnami `nginx` chart listing: https://artifacthub.io/packages/helm/bitnami/nginx

## Issues Found
- The prerequisites were too generic and overstated admin requirements. I corrected them to match current Rancher Desktop requirements: Windows needs WSL 2 beforehand, Linux needs read-write access to `/dev/kvm`, admin or sudo access may be required during installation, and the documented resource guidance is 8 GB RAM and 4 CPU cores.
- The post used `rdctl set --kubernetes-version v1.28.0` and `rdctl set --kubernetes-version v1.29.0`. The current Rancher Desktop command reference documents `rdctl` version examples without the `v` prefix, so these were corrected to `1.28.0` and `1.29.0`.
- The post implied the Docker CLI was always interchangeable with `nerdctl`. I clarified that Docker commands apply when Rancher Desktop is using Moby/dockerd, while the shown `nerdctl` workflow applies to the containerd engine.
- The post omitted the documented version-switching behavior that upgrades retain workloads and images, while downgrades remove workloads but retain images. I added that caveat in the configuration section.
- The `Common Configuration Tasks` section used unsupported or misleading current CLI examples: `rdctl factory-reset`, `rdctl status`, and `rdctl list-settings | grep kubernetesVersion` as a version lister. I replaced these with currently documented behavior: use `rdctl list-settings` for active settings, and use the Rancher Desktop UI for Reset Kubernetes and for choosing from the available Kubernetes versions.
- The troubleshooting section listed guessed log paths and reused `rdctl factory-reset`, which is not part of the current documented `rdctl` command reference. I replaced these with the documented UI workflows for `Troubleshooting > Show Logs` and `Troubleshooting > Factory Reset`, and kept `rdctl list-settings` for reviewing current VM-related settings.

## Review Notes
- The Kubernetes and Helm command examples are technically valid as written.
- Rancher Desktop’s `rdctl` CLI is documented as experimental and subject to change, so CLI-heavy posts like this one should be revalidated periodically.
- Rancher Desktop currently documents version switching primarily through the UI. The CLI can set a target Kubernetes version, but the docs do not provide a documented CLI command to list all selectable Kubernetes versions; the UI remains the authoritative place to see the available version list on a given machine.
