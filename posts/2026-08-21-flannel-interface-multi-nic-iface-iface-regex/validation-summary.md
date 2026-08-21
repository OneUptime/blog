# Validation Summary: Select a Flannel Interface on Multi-NIC Nodes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes DaemonSets and Node annotations
- Flannel v0.28.8
- Flannel interface selection (`--iface`, `--iface-regex`, and `--iface-can-reach`)
- Linux iproute2 routing and interface inspection
- VXLAN, NAT, MTU, and multi-NIC networking
- YAML and jq

## Sources Consulted
- [Flannel v0.28.8 release](https://github.com/flannel-io/flannel/releases/tag/v0.28.8)
- [Flannel configuration and interface-selection flags](https://github.com/flannel-io/flannel/blob/v0.28.8/Documentation/configuration.md#key-command-line-options)
- [Flannel selector precedence in `main.go`](https://github.com/flannel-io/flannel/blob/v0.28.8/main.go#L316-L367)
- [Flannel interface matching, route lookup, public IP, and startup logging implementation](https://github.com/flannel-io/flannel/blob/v0.28.8/pkg/ipmatch/match.go#L53-L315)
- [Flannel interface selection and restart behavior](https://github.com/flannel-io/flannel/blob/v0.28.8/Documentation/running.md#interface-selection)
- [Flannel interface, NAT, MTU, and firewall troubleshooting](https://github.com/flannel-io/flannel/blob/v0.28.8/Documentation/troubleshooting.md#interface-selection-and-the-public-ip)
- [Flannel Kubernetes Node annotations](https://github.com/flannel-io/flannel/blob/v0.28.8/Documentation/kubernetes.md#annotations)
- [Flannel backend reference](https://github.com/flannel-io/flannel/blob/v0.28.8/Documentation/backends.md#vxlan)
- [Flannel Linux VXLAN device implementation](https://github.com/flannel-io/flannel/blob/v0.28.8/pkg/backend/vxlan/device.go)
- [Flannel Linux VXLAN route, neighbor, FDB, and MTU implementation](https://github.com/flannel-io/flannel/blob/v0.28.8/pkg/backend/vxlan/vxlan_network.go)
- [Kubernetes `kubectl logs` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes `kubectl rollout restart` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/)
- [Kubernetes `kubectl rollout status` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [Kubernetes DaemonSet update documentation](https://kubernetes.io/docs/tasks/manage-daemon/update-daemon-set/)
- [Kubernetes Node address documentation](https://kubernetes.io/docs/reference/node/node-status/#addresses)
- [Linux `ip-route(8)` manual](https://man7.org/linux/man-pages/man8/ip-route.8.html)
- [Linux `ip-link(8)` manual](https://man7.org/linux/man-pages/man8/ip-link.8.html)
- [jq manual](https://jqlang.org/manual/)

## Issues Found
- The selector-precedence explanation stopped after exact and regex selectors and did not state that `--iface-can-reach` is unsupported on Windows. It now documents the complete `--iface` → `--iface-regex` → `--iface-can-reach` order and scopes reachability selection to Linux.
- Both `kubectl logs daemonset/kube-flannel-ds` commands omitted `--all-pods=true`. Without that flag, current kubectl selects one Pod behind the DaemonSet, so the commands could not inspect or verify Flannel on every node. The flag was added to both commands.
- The first log filter searched for `public address`, which is not a current Flannel startup-log phrase and misses an explicitly configured public IP. It now matches the current interface-detection messages and `external address` output.
- Both VXLAN checks hard-coded `flannel.1`, which exists only for the default IPv4 VNI of 1. They now use `ip -d link show type vxlan`, and the explanation identifies the relevant `local` value as Flannel's local tunnel source.
- The `--public-ip` explanation covered only peer advertisement. Current Flannel also treats it as a local-IP interface lookup when no separate interface selector is present, so that behavior is now stated explicitly.

## Review Notes
The guide is Linux-focused because it uses iproute2 and Linux VXLAN devices; Flannel's `--iface-can-reach` option is not supported on Windows. A DaemonSet has no native partitioned canary setting, so the suggested one-node canary must be implemented by the deployment system, such as through mutually exclusive node targeting or a controlled `OnDelete` workflow. The remaining commands, YAML fragments, jq filter, routing guidance, NAT/checksum caveat, MTU guidance, annotation descriptions, and restart caveats are consistent with Flannel v0.28.8 and current Kubernetes documentation.
