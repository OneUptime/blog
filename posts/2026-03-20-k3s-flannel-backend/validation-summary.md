# Validation Summary: How to Configure K3s Flannel Backend

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Flannel
- WireGuard
- IPsec / strongSwan
- Cilium
- Helm
- `kubectl`

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- WireGuard Installation Guide: https://www.wireguard.com/install/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Cilium installation using Helm: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- flannel CNI plugin README: https://github.com/flannel-io/cni-plugin

## Issues Found
- The post described `ipsec` as a current K3s backend. I changed it to legacy-only guidance and noted that the backend is not available in K3s v1.27 and higher, which matches current K3s documentation.
- The WireGuard section said `wireguard-native` requires kernel 5.6+. I corrected this to require WireGuard kernel module support instead, because WireGuard is built into newer kernels but also has supported backports for older kernels.
- The install examples used `INSTALL_K3S_EXEC=... sudo sh -`, which is easy to misapply and did not match the documented install-script pattern. I replaced those with `curl ... | sudo sh -s - --flannel-backend ...` so the commands align with K3s install-script usage.
- The backend-switching section instructed readers to delete local Flannel CNI state and interfaces manually. I replaced it with the documented migration approach for legacy `wireguard`/`ipsec` to `wireguard-native`: update the backend on all server nodes and reboot all nodes, starting with the servers.
- The VXLAN MTU section claimed MTU could be configured via `kube-proxy-arg`, which is unrelated to Flannel MTU. I removed that incorrect configuration snippet and replaced it with an inspection command based on Flannel's `FLANNEL_MTU` state.
- The benchmark and MTU example pods did not wait for pod readiness or completion, so the commands could fail intermittently. I added explicit `kubectl wait` steps and `--command --` where needed so the examples behave reliably.

## Review Notes
- `flannel-backend` is a server-side K3s setting and must match across all server nodes.
- The IPsec notes are now explicitly version-gated. Readers on current K3s releases should use `wireguard-native` for encrypted Flannel networking.
- The Cilium example remains valid as a basic BYO-CNI example with `--flannel-backend none --disable-network-policy`, but exact chart values may vary by Cilium release.
