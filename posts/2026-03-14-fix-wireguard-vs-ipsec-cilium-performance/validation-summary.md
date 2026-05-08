# Validation Summary: Fixing WireGuard vs IPsec Performance Differences in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- WireGuard
- IPsec
- Linux XFRM
- Linux sysctl
- iperf3

## Sources Consulted
- Cilium WireGuard Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium IPsec Transparent Encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium routing documentation for native routing and `ipv4NativeRoutingCIDR`: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium CLI `cilium encryption status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Linux kernel XFRM sysctl documentation: https://www.kernel.org/doc/html/v6.2/networking/xfrm_sysctl.html
- Helm upgrade command documentation: https://helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The native-routing Helm examples enabled `routingMode=native` without setting `ipv4NativeRoutingCIDR`. Cilium documents native routing as requiring a native routing CIDR for the routable pod or VPC range, so the examples now include `--set ipv4NativeRoutingCIDR=$NATIVE_CIDR`.
- The IPsec example claimed `ip xfrm state | grep -i offload` verifies hardware offload. Cilium's IPsec documentation describes XFRM state and policy validation, while hardware offload is environment and NIC dependent. The example now inspects `ip xfrm state` and `ip xfrm policy` instead.
- The IPsec sysctl comment said `net.core.xfrm_acq_expires` increases the XFRM state hash table. Linux kernel documentation defines it as the acquire request hard timeout, so the comment was corrected.
- The migration and verification sections used `cilium encrypt status`, which is not the current Cilium management CLI command. Updated those commands to `cilium encryption status`.
- The migration Helm command changed only `encryption.type` without `--reuse-values`, which risks losing existing chart values during an upgrade. Added `--reuse-values` for the protocol switch example.
- The validation checklist used `cilium monitor` and `cilium endpoint list` as top-level Cilium CLI commands. Current Cilium documentation exposes these as in-agent `cilium-dbg` commands, so the examples now run `cilium-dbg monitor --type drop` and `cilium-dbg endpoint list` through `kubectl exec ds/cilium`.

## Review Notes
- The post still uses placeholder variables such as `$NATIVE_CIDR`, `$SERVER_IP`, `perf-client`, and `perf-server.monitoring`; readers must substitute values that match their cluster.
- The `mtu=1380`, socket buffer sysctls, and performance-tuning values are workload and environment dependent. They are syntactically valid examples, but should be benchmarked before use in production.
