# Validation Summary: How to Use Rancher Desktop with Helm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Desktop
- `rdctl`
- Kubernetes
- `kubectl`
- Helm
- Helm charts
- `nerdctl`
- Docker / Moby

## Sources Consulted
- Rancher Desktop Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop bundled utilities: https://docs.rancherdesktop.io/references/bundled-utilities/
- Rancher Desktop container engine preferences: https://docs.rancherdesktop.io/ui/preferences/container-engine/general/
- Rancher Desktop troubleshooting UI: https://docs.rancherdesktop.io/ui/troubleshooting
- Rancher Desktop release notes for `rdctl reset`: https://github.com/rancher-sandbox/rancher-desktop/releases
- Rancher Desktop Testcontainers guide (`rdctl info`, current `rdctl set` examples): https://docs.rancherdesktop.io/how-to-guides/using-testcontainers
- Kubernetes `kubectl cluster-info`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/
- Kubernetes `kubectl create deployment`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm command docs: https://helm.sh/docs/helm/
- Bitnami Helm chart repository: https://charts.bitnami.com/
- `nerdctl` project documentation: https://github.com/containerd/nerdctl

## Issues Found
- The prerequisite stating administrator or sudo access was too absolute. I changed it to say privileges may be required, which matches Rancher Desktop's platform-specific installation docs.
- The overview implied `docker` and `nerdctl` are both generally available in the same way. I clarified that Rancher Desktop uses either `nerdctl` or `docker` depending on the selected container engine.
- The `rdctl set --kubernetes-version` examples used old hard-coded versions with a `v` prefix. I replaced them with `<supported-version>` placeholders so the commands reflect currently supported Rancher Desktop Kubernetes versions.
- The container workflow mixed `docker` and `nerdctl` commands even though Rancher Desktop only runs one container engine at a time. I made the example consistent with the article's `containerd` configuration by keeping the workflow on `nerdctl`.
- `rdctl status` is not a current documented Rancher Desktop command. I replaced it with `rdctl info`.
- `rdctl factory-reset` was used where the text said to reset only Kubernetes. I corrected this to `rdctl reset --k8s` for Kubernetes-only reset and `rdctl reset --factory` for full factory reset. Rancher Desktop release notes describe `rdctl reset` as the newer command, with `rdctl factory-reset` deprecated and hidden.
- `rdctl list-settings | grep kubernetesVersion` was incorrect because `list-settings` shows current JSON settings rather than available Kubernetes versions, and the JSON key is nested under `kubernetes.version`. I changed this to the accurate `rdctl list-settings` command and updated the description.
- `rdctl list-settings | grep -i vm` would not reliably match the current JSON output. I replaced it with a search for the `virtualMachine` section.
- The troubleshooting log paths had a broken Windows/Linux line and the macOS path casing was wrong. I corrected the formatting and the path names.

## Review Notes
- The Helm commands in the post remain valid, but current Rancher Desktop releases may bundle Helm 4.x rather than Helm 3.x. The basic `helm repo add`, `helm repo update`, `helm install`, `helm list`, and `helm uninstall` workflow used here still applies.
- The post uses `nginx:latest`, which is technically valid but less reproducible than pinning a specific image tag.
- Rancher Desktop documents `rdctl` as experimental and subject to change, so CLI examples may need periodic revalidation in future reviews.
