# Validation Summary: How to Debug Applications in Rancher Desktop

## Status
validated

## Post Type
Technical guide / Tutorial

## Technologies Covered
- Rancher Desktop
- Kubernetes
- k3s
- `rdctl`
- `nerdctl`
- Docker / Moby
- Helm

## Sources Consulted
- Rancher Desktop introduction: https://docs.rancherdesktop.io/
- Rancher Desktop installation requirements and bundled utilities: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop image workflow guidance: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop Kubernetes preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop container engine preferences: https://docs.rancherdesktop.io/ui/preferences/container-engine/general/
- Rancher Desktop troubleshooting UI: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop release notes covering `rdctl info` and the newer `rdctl reset` command: https://github.com/rancher-sandbox/rancher-desktop/releases
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm command reference: https://helm.sh/docs/helm/
- Helm `helm install` reference: https://helm.sh/docs/v3/helm/helm_install/
- Helm `helm repo add` reference: https://v3.helm.sh/docs/v3/helm/helm_repo_add/
- Bitnami chart repository: https://charts.bitnami.com/

## Issues Found
- The prerequisites claimed administrator or sudo access was always required for installation. Updated that line to make it conditional, which matches Rancher Desktop's OS-specific installation guidance.
- The initial setup section used `rdctl version` to imply Rancher Desktop itself was running. Replaced it with `rdctl info`, which is the current command for getting active Rancher Desktop runtime information.
- The `rdctl set` examples used Kubernetes versions with a leading `v` and older flag shapes. Updated them to current settings-path flags and plain version values.
- The container workflow mixed `docker pull` with `nerdctl run`, `ps`, `logs`, and cleanup commands. Added matching Docker alternatives so the examples are valid for both supported Rancher Desktop runtimes.
- The Common Configuration Tasks section used incorrect or outdated `rdctl` commands: `rdctl factory-reset`, `rdctl status`, and `rdctl list-settings | grep kubernetesVersion`. Replaced them with the current `rdctl reset --k8s`, `rdctl info`, `rdctl list-settings`, and corrected Kubernetes version update command.
- The troubleshooting section had a malformed log-path line and outdated reset guidance. Replaced it with the current official Troubleshooting > Show Logs instruction and `rdctl reset --factory`.

## Review Notes
- `rdctl factory-reset` is still supported in newer Rancher Desktop releases, but it is deprecated and hidden in favor of `rdctl reset --factory`.
- The post's shell examples are written as `bash`; Windows readers will typically need WSL or Git Bash for commands that rely on POSIX shell behavior such as backgrounding with `&`.
- The Bitnami repository URL used in the post is still valid. Bitnami also supports OCI-based chart installs, but the repository-based example remains technically correct.
