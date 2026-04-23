# Validation Summary: How to Install Rancher Desktop on Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Rancher Desktop
- Linux package management (`apt`, `dnf`, `zypper`, AppImage)
- `rdctl`
- Kubernetes / k3s
- `kubectl`
- Helm
- `nerdctl`
- Docker / Moby

## Sources Consulted
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Kubernetes preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop Troubleshooting UI: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop Working with Images: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop Working with Containers: https://docs.rancherdesktop.io/tutorials/working-with-containers/
- Rancher Desktop Using Testcontainers with Rancher Desktop: https://docs.rancherdesktop.io/how-to-guides/using-testcontainers/
- Kubernetes `kubectl create deployment`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm Using Helm: https://docs.helm.sh/docs/intro/using_helm/
- Bitnami charts repository: https://github.com/bitnami/charts

## Issues Found
- The prerequisites were not Linux-specific. The original post listed macOS and Windows as acceptable install targets and omitted current Linux requirements such as an x86_64 CPU with virtualization support, persistent internet access, and read-write access to `/dev/kvm`. I replaced the prerequisites with the Linux requirements documented by Rancher Desktop.
- The article did not actually show how to install Rancher Desktop on Linux. “Step 1” only verified an existing installation. I replaced that section with the official Linux installation paths for `.deb`, Fedora/openSUSE `.rpm`, and AppImage builds, plus the required `/dev/kvm` access check.
- The configuration examples used stale or incorrect `rdctl` commands for the current docs. I removed `rdctl status`, removed the invalid `rdctl list-settings | grep kubernetesVersion` example, and updated the configuration examples to supported `rdctl` options documented in current Rancher Desktop references and guides.
- The troubleshooting section had a malformed log-path line and Linux troubleshooting guidance that did not match the official docs. I replaced it with the documented “Show Logs” UI guidance, a `/dev/kvm` access check, the Linux Traefik privileged-port workaround, and the documented factory-reset command.

## Review Notes
- Rancher Desktop’s current documentation mixes legacy `rdctl factory-reset` references with a newer `rdctl reset` command in the CLI help. I kept `rdctl factory-reset` because it is still present in current official documentation, but this should be rechecked on future reviews.
- The post now makes it explicit that `docker` commands apply when the Moby/dockerd engine is selected; `nerdctl` applies when the containerd engine is selected.
- The Bitnami chart example remains workable because the chart repository URL still resolves, but Bitnami’s current repository README emphasizes OCI installs as the primary pattern. That is a future improvement, not a correctness blocker.
