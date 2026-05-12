# Validation Summary: How to Test Crypto Authentication for Calico Node Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (v3.26+)
- Kubernetes
- WireGuard
- FelixConfiguration (projectcalico.org/v3)
- calicoctl / kubectl
- BGP
- tcpdump / netshoot debug image

## Sources Consulted
- Calico FelixConfiguration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico "Encrypt in-cluster pod traffic" guide: https://docs.tigera.io/calico/latest/network-policy/encrypt-cluster-pod-traffic
- Calico Felix config_params.go (source of truth for field names): https://github.com/projectcalico/calico/blob/master/felix/config/config_params.go
- Calico API types (FelixConfiguration JSON tags): https://github.com/projectcalico/api/blob/master/pkg/apis/projectcalico/v3/felixconfig.go
- wg(8) manpage / wireguard-tools

## Issues Found
1. **Incorrect FelixConfiguration field name `wireguardInterfaceMTU`** — The actual field name in the `projectcalico.org/v3` API is `wireguardMTU` (per `felixconfig.go` JSON tag `wireguardMTU` and the Go struct `WireguardMTU`). There is no `wireguardInterfaceMTU` field (the similarly named `wireguardInterfaceName` exists but is for the interface name, not MTU). Fixed by renaming the YAML key to `wireguardMTU`.
2. **Incorrect WireGuard interface name `calico.wireguard`** — Calico's default IPv4 WireGuard interface is `wireguard.cali` (and `wg-v6.cali` for IPv6), per the `WireguardInterfaceName` default in the Calico source. The `wg show calico.wireguard peers` command would fail. Fixed by changing it to `wg show wireguard.cali peers`.

## Review Notes
- The post's claim that enabling `wireguardEnabled` "protects the BGP control plane" is technically imprecise. By default, Calico WireGuard encrypts pod-to-pod traffic only; host-network traffic (including BGP) is not encrypted unless `wireguardHostEncryptionEnabled: true` is also set, and per Calico docs that mode is officially supported only on EKS and AKS clusters. The introduction and conclusion overstate the default scope, but the post still functions as a valid WireGuard enablement guide — left wording untouched per the "fix only technical errors, no restructuring" guidance.
- `kubectl exec -n kube-system calico-node-xxx -- wg show` requires `wg` to be available inside the calico-node container (it is in modern Calico images that ship wireguard-tools) and the placeholder `calico-node-xxx` is intended to be replaced by the reader.
- Prerequisite "Calico v3.26+" is fine; WireGuard support went GA before 3.26.
- Linux kernel 5.6+ is correct for upstream WireGuard; some distros backport WireGuard to earlier kernels (RHEL/CentOS via kmod, Ubuntu 18.04/20.04 backports), but the stated requirement is a safe baseline.
