# Validation Summary: How to Troubleshoot Rancher Desktop Not Starting

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- Kubernetes / `kubectl`
- Helm
- `nerdctl`
- Docker / Moby

## Sources Consulted
- Rancher Desktop command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop introduction: https://docs.rancherdesktop.io/
- Rancher Desktop installation requirements: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop container engine settings: https://docs.rancherdesktop.io/ui/preferences/container-engine/general/
- Rancher Desktop Kubernetes settings: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop troubleshooting UI docs: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop working with images: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop working with containers: https://docs.rancherdesktop.io/tutorials/working-with-containers/
- Rancher Desktop Testcontainers guide (`rdctl info --field ip-address`): https://docs.rancherdesktop.io/how-to-guides/using-testcontainers
- Rancher Desktop official source for current `rdctl reset` and deprecated `factory-reset`: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/cmd/reset.go
- Rancher Desktop official source for hidden/deprecated `factory-reset`: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/cmd/factoryReset.go
- Rancher Desktop official source for platform log paths: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/pkg/paths/paths.go
- Rancher Desktop official source for macOS paths: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/pkg/paths/paths_darwin.go
- Rancher Desktop official source for Linux paths: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/pkg/paths/paths_linux.go
- Rancher Desktop official source for Windows paths: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/pkg/paths/paths_windows.go
- Kubernetes `kubectl cluster-info`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/
- Kubernetes `kubectl create deployment`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes `kubectl get`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Helm command reference: https://docs.helm.sh/docs/helm/
- Helm `helm repo add`: https://docs.helm.sh/docs/helm/helm_repo_add/
- Helm `helm repo update`: https://docs.helm.sh/docs/helm/helm_repo_update/
- Helm `helm install`: https://docs.helm.sh/docs/helm/helm_install/
- Helm `helm list`: https://docs.helm.sh/docs/helm/helm_list/
- Helm `helm uninstall`: https://docs.helm.sh/docs/helm/helm_uninstall/
- Helm `helm version`: https://docs.helm.sh/docs/helm/helm_version/
- Bitnami charts README: https://github.com/bitnami/charts/blob/main/README.md
- Bitnami charts index (confirmed `nginx` chart still exists): https://charts.bitnami.com/bitnami/index.yaml
- nerdctl project README: https://github.com/containerd/nerdctl

## Issues Found
- The post used `rdctl status`, which is not a current `rdctl` command. I replaced it with `rdctl info`, which is the current command exposed by Rancher Desktop.
- The post used `rdctl factory-reset` where it meant two different operations. I changed the Kubernetes-only reset example to `rdctl reset --k8s`, and the factory reset example to `rdctl reset --factory`. Rancher Desktop still ships `rdctl factory-reset`, but the current source marks it hidden and deprecated.
- The post claimed `rdctl list-settings | grep kubernetesVersion` would list available Kubernetes versions. `rdctl list-settings` shows the current JSON settings, not the list of installable versions. I changed that example to `rdctl list-settings` with an accurate description.
- The post used `rdctl list-settings | grep -i vm` to check VM status. That does not match the current settings structure. I replaced it with `rdctl info --field ip-address`, which Rancher Desktop documents as a way to confirm the VM is up and returning an address.
- The troubleshooting log paths were incorrect. The macOS path casing was wrong, and the Windows and Linux paths were accidentally merged onto one line. I corrected the log directories to the current platform paths.
- The container example mixed `docker pull` with later `nerdctl run`, `nerdctl ps`, and `nerdctl logs` commands. Because Rancher Desktop only runs one container engine at a time, that was inconsistent. I normalized that block to a `nerdctl`/containerd example.
- The `rdctl set` examples used hard-coded `v`-prefixed Kubernetes versions and did not mention that `rdctl set` requires Rancher Desktop to already be running. I updated the examples to current syntax and clarified the runtime requirement in the surrounding comments.
- The prerequisites and VM settings lines overstated requirements and GUI capabilities compared with the official docs. I adjusted them to match the documented recommendations and current UI behavior.

## Review Notes
- Rancher Desktop’s `rdctl` surface is still marked experimental in the official docs, and some doc pages lag behind the current source. The post now uses the current command names where the source and docs diverge.
- Bitnami’s chart documentation now prefers OCI installs such as `oci://registry-1.docker.io/bitnamicharts/<chart>`, but the classic `helm repo add bitnami https://charts.bitnami.com/bitnami` flow still works and the `nginx` chart is still published there.
- Several `rdctl` commands in the post, including `set` and `list-settings`, only work when Rancher Desktop is already running. That caveat matters for a “not starting” troubleshooting guide, so it is now called out inline where those commands appear.
