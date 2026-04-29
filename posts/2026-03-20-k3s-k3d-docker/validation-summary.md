# Validation Summary: How to Run K3s in Docker (K3d) - Part 3

## Status
validated

## Post Type
Guide

## Technologies Covered
- k3d
- K3s
- Kubernetes
- kubectl
- Docker
- ingress-nginx
- GitHub Actions

## Sources Consulted
- k3d installation and stable docs: https://k3d.io/stable/
- k3d config file reference: https://k3d.io/stable/usage/configfile/
- k3d kubeconfig handling: https://k3d.io/stable/usage/kubeconfig/
- k3d image import command reference: https://k3d.io/stable/usage/commands/k3d_image_import/
- k3d registry usage guide: https://k3d.io/stable/usage/registries/
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s networking services docs: https://docs.k3s.io/networking/networking-services
- K3s storage docs: https://docs.k3s.io/add-ons/storage
- kubectl install docs for Linux: https://kubernetes.io/docs/tasks/tools/install-kubectl-linux/
- kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Ingress docs: https://kubernetes.io/docs/concepts/services-networking/ingress/
- ingress-nginx installation guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx guidance on IngressClass usage: https://kubernetes.github.io/ingress-nginx/user-guide/multiple-ingress/
- k3d releases: https://github.com/k3d-io/k3d/releases
- K3s releases: https://github.com/k3s-io/k3s/releases

## Issues Found
- The multi-node cluster example used `--server-arg` and `--agent-arg`, which are not the supported k3d flags in current documentation. I replaced them with `--k3s-arg` plus node filters so the commands match documented k3d syntax.
- The kubectl install snippet moved the binary into `/usr/local/bin` without elevated privileges. I changed it to the documented `sudo install -o root -g root -m 0755 ...` form from the official Kubernetes install guide.
- The ingress example deployed ingress-nginx without disabling K3s' default Traefik ingress controller. On K3s, Traefik is installed by default, so I disabled Traefik for that cluster example to avoid controller and port conflicts.
- The ingress manifest used the deprecated `kubernetes.io/ingress.class` annotation. I replaced it with `spec.ingressClassName: nginx`, which is the current Kubernetes and ingress-nginx guidance.
- The ingress-nginx manifest URL pointed at the moving `main` branch. I pinned it to the current release manifest shown in the official ingress-nginx installation docs and aligned the readiness wait timeout with that documentation.
- The post pinned older example versions (`k3d` `v5.6.0` and `rancher/k3s:v1.29.3-k3s1`). I updated those examples to the current stable releases available on 2026-04-29: `k3d` `v5.8.3` and `rancher/k3s:v1.35.4-k3s1`.

## Review Notes
- The post is technically sound after the fixes above.
- The GitHub Actions example currently works with `ubuntu-latest` because GitHub-hosted Ubuntu runners include `kubectl`, but that dependency is implicit and may drift over time as runner images change.
- The k3d config file syntax is still `apiVersion: k3d.io/v1alpha5` in the current stable docs, but the k3d docs note that the config format is still evolving.
