# Validation Summary: How to Build Container Images with Rancher Desktop

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- `nerdctl`
- Docker / Moby
- Kubernetes / `kubectl`
- Helm
- Bitnami NGINX chart

## Sources Consulted
- Rancher Desktop installation requirements: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop image workflows: https://docs.rancherdesktop.io/tutorials/working-with-images/
- Rancher Desktop local image to Kubernetes example: https://docs.rancherdesktop.io/how-to-guides/hello-world-example/
- Rancher Desktop `rdctl set --container-engine.name=moby` example: https://docs.rancherdesktop.io/how-to-guides/using-testcontainers/
- Kubernetes `kubectl cluster-info` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cluster-info/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm repository usage: https://docs.helm.sh/docs/intro/using_helm/
- Helm install reference: https://helm.sh/docs/helm/helm_install/
- Helm uninstall reference: https://helm.sh/docs/helm/helm_uninstall/
- Bitnami chart repository index (`nginx` chart present): https://charts.bitnami.com/bitnami/index.yaml
- Author link verification: https://github.com/nawazdhandala

## Issues Found
- The post title and description were about building container images, but the original container section only pulled and ran an existing image. I added documented `nerdctl build` and `docker build` examples and included the required `--namespace k8s.io` guidance for `nerdctl` images intended for Kubernetes.
- The prerequisites were too generic and did not match current Rancher Desktop requirements. I updated them to reflect supported platforms, internet connectivity during setup, virtualization requirements, Windows WSL2, Linux `/dev/kvm` access, and the current recommended memory and CPU guidance.
- Several `rdctl` examples were inaccurate or outdated for current documentation. I removed the hard-coded `--kubernetes-version v...` examples, replaced undocumented/misleading commands such as `rdctl status`, and removed `grep` examples that did not match the current `rdctl list-settings` JSON structure.
- The troubleshooting log path comment was malformed and not aligned with current official guidance. I replaced it with the documented UI-based troubleshooting flow and retained CLI checks that are still documented.

## Review Notes
- `rdctl` is documented by Rancher Desktop as experimental, so command names and flags may change between releases. Future edits should re-check all CLI snippets against the current command reference.
- Rancher Desktop supports both `nerdctl` and the Docker CLI, but they apply to different runtime choices: use `nerdctl` with `containerd` and the Docker CLI with `moby`.
