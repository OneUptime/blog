# Validation Summary: How to Deploy Applications Locally with Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- Kubernetes
- k3s
- Helm
- nerdctl
- Docker

## Sources Consulted
- Rancher Desktop Docs: Introduction — https://docs.rancherdesktop.io/
- Rancher Desktop Docs: Installation — https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop Docs: Kubernetes preferences — https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop Docs: `rdctl` command reference — https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop Docs: Troubleshooting — https://docs.rancherdesktop.io/ui/troubleshooting/
- Official Rancher Desktop source code (`reset.go`, `factoryReset.go`, `command-api.yaml`, and path definitions) — https://github.com/rancher-sandbox/rancher-desktop
- Kubernetes docs: Using kubectl to create a Deployment — https://kubernetes.io/docs/tutorials/kubernetes-basics/deploy-app/deploy-intro/
- Kubernetes docs: `kubectl expose` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes docs: `kubectl port-forward` — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm docs: Using Helm — https://docs.helm.sh/docs/intro/using_helm/
- Bitnami package for NGINX Open Source — https://bitnami.com/stack/nginx/helm
- Docker Docs: Running containers — https://docs.docker.com/engine/containers/run/
- nerdctl command reference — https://github.com/containerd/nerdctl/blob/main/docs/command-reference.md

## Issues Found
- The post used `rdctl status`, which is not a current Rancher Desktop CLI command. I replaced it with `rdctl list-settings`.
- The post used `rdctl factory-reset` to reset Kubernetes, but that command performs a full factory reset and is deprecated in favor of `rdctl reset --factory`. I changed the Kubernetes reset example to `rdctl reset --k8s` and the factory-reset troubleshooting example to `rdctl reset --factory`.
- The post claimed `rdctl list-settings | grep kubernetesVersion` lists available Kubernetes versions. It does not; `rdctl list-settings` only shows the active configuration. I removed that incorrect command.
- The container workflow only showed `nerdctl` for running, listing, and stopping containers even though Rancher Desktop supports either `containerd` or `moby`. I added equivalent `docker` commands for Moby users.
- The troubleshooting log paths had a formatting issue and the macOS path used the wrong directory name. I split the Windows and Linux paths onto separate lines and corrected the macOS path to `~/Library/Logs/rancher-desktop/`.
- The post hardcoded Kubernetes versions for `rdctl set`. Available versions depend on the Rancher Desktop release, so I replaced them with `<supported-kubernetes-version>` placeholders.
- The prerequisites described RAM and CPU as hard minimums, while Rancher Desktop documents them as recommendations. I updated that wording.

## Review Notes
- Rancher Desktop’s available Kubernetes versions vary by Rancher Desktop release, so fixed version numbers in a general deployment guide can become stale quickly.
- `rdctl set` still documents legacy aliases such as `--kubernetes-version` and `--container-engine`, even though newer dotted flag names also exist in the current CLI schema.
