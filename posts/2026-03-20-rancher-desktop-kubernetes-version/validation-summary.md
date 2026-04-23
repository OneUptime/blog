# Validation Summary: How to Configure Rancher Desktop Kubernetes Version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher Desktop
- Kubernetes
- K3s
- `rdctl`
- `kubectl`
- `nerdctl`
- Docker CLI / Moby
- Helm

## Sources Consulted
- Rancher Desktop Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop Kubernetes preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Working with Images: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop Using Testcontainers: https://docs.rancherdesktop.io/how-to-guides/using-testcontainers
- Rancher Desktop Generating Deployment Profiles: https://docs.rancherdesktop.io/how-to-guides/generating-deployment-profiles/
- Kubernetes `kubectl create deployment` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_deployment/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm `helm install` reference: https://helm.sh/docs/v3/helm/helm_install/
- Helm `helm repo add` reference: https://v3.helm.sh/docs/v3/helm/helm_repo_add/
- Bitnami Charts repository: https://github.com/bitnami/charts
- Rancher Desktop maintainer answer on platform data and log locations: https://github.com/rancher-sandbox/rancher-desktop/discussions/1551

## Issues Found
- The post used hard-coded `rdctl set --kubernetes-version v1.28.0` and `v1.29.0` examples. Current Rancher Desktop documentation uses plain version numbers rather than a `v` prefix, and hard-coding older versions can easily become invalid. Updated both examples to use `<VERSION>`.
- The post used `rdctl status`, which is not a documented current `rdctl` command. Replaced it with `rdctl info`, which is documented.
- The post claimed `rdctl list-settings | grep kubernetesVersion` would list available Kubernetes versions. `rdctl list-settings` shows the current settings JSON, and there is no `kubernetesVersion` field in that output. Replaced it with `rdctl list-settings` and updated the description accordingly.
- The post labeled `rdctl factory-reset` as resetting only the Kubernetes cluster. Rancher Desktop documents factory reset as removing the cluster and other Rancher Desktop settings. Updated the description to match the command's actual behavior.
- The troubleshooting log paths had a formatting error that merged the Windows and Linux lines, and the macOS log directory casing/path was incorrect. Corrected the platform-specific log paths.
- The troubleshooting command `rdctl list-settings | grep -i vm` would not reliably match the `virtualMachine` key. Replaced it with a command that prints the `virtualMachine` section from the settings output.

## Review Notes
- Rancher Desktop's current documentation is slightly inconsistent between older shorthand `rdctl` examples and newer field-style flags shown in some guides and help output. The commands left in the post match currently documented usage and avoid version-specific values that can age out quickly.
- The Bitnami example remains valid after adding the Bitnami repository, although Bitnami also supports OCI-based chart installs in current documentation.
