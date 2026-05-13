# Validation Summary: Install Cilium on k0s with k0sctl

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- k0s
- k0sctl
- Kubernetes
- Cilium
- Hubble
- Helm charts
- CiliumNetworkPolicy
- eBPF networking

## Sources Consulted
- k0sctl official documentation and configuration reference: https://github.com/k0sproject/k0sctl
- k0s official k0sctl installation guide: https://docs.k0sproject.io/v1.34.4+k0s.0/k0sctl-install/
- k0s official networking documentation for custom CNI providers: https://docs.k0sproject.io/stable/networking/
- k0s official configuration reference for `spec.network` and `kubeProxy.disabled`: https://docs.k0sproject.io/head/configuration/
- k0s official cluster extensions / Helm chart documentation: https://docs.k0sproject.io/v1.21.11+k0s.0/extensions/
- k0s official upgrade documentation for `k0sctl apply` and `--no-drain`: https://docs.k0sproject.io/head/upgrade/
- k0s official backup/restore documentation: https://docs.k0sproject.io/v1.34.3+k0s.0/backup/
- Cilium official k0s installation guide: https://docs.cilium.io/en/latest/installation/k0s/
- Cilium official Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium official Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium official Kubernetes policy documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Kubernetes official Cilium NetworkPolicy task: https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/cilium-network-policy/

## Issues Found
- The prerequisite listed `curl -sSfL https://get.k0sproject.io | sh` as the way to install `k0sctl`. That installer is for k0s, while k0sctl is distributed as a separate binary. Changed the prerequisite to state that `k0sctl` must be installed on the management machine.
- The k0sctl binary download used `k0sctl-linux-x64`, but official release assets use architecture names such as `k0sctl-linux-amd64`. Updated the download URL and used `sudo install -m 0755` so installing to `/usr/local/bin` works for normal users.
- The example pinned `k0s` `1.29.2+k0s.0` and Cilium `1.15.0`, which is outdated for a post validated on 2026-05-13. Updated the examples to `v1.34.5+k0s.0` and Cilium `1.19.3`, a supported pairing based on current Cilium Kubernetes compatibility information.
- The k0sctl command examples used the short `-c` flag. Replaced it with the documented `--config` flag for consistency with official k0s/k0sctl documentation.
- The Cilium pod check used selector `app.kubernetes.io/name=cilium`, but current Cilium examples and chart labels use `k8s-app=cilium` for Cilium agent pods. Updated the selector.
- The DNS egress policy matched every pod in `kube-system` on port 53. Added `k8s-app: kube-dns`, matching Cilium's documented DNS policy pattern and avoiding overbroad DNS egress.

## Review Notes
The post is now technically valid as a k0sctl-driven k0s installation guide that uses k0s custom CNI configuration and the k0s Helm extension mechanism to install Cilium. The `k8sServiceHost` placeholder must be replaced with a reachable Kubernetes API endpoint for real deployments, as required when using Cilium kube-proxy replacement.
