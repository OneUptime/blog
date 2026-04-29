# Validation Summary: How to Set Up WireGuard for K3s Flannel Backend

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Flannel
- WireGuard
- Linux networking
- `kubectl`

## Sources Consulted
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Server CLI Reference: https://docs.k3s.io/cli/server
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Requirements: https://docs.k3s.io/installation/requirements
- WireGuard Installation Guide: https://www.wireguard.com/install/
- WireGuard Quick Start: https://www.wireguard.com/quickstart/
- Flannel Configuration: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- Flannel Backends: https://github.com/flannel-io/flannel/blob/master/Documentation/backends.md
- Flannel WireGuard backend source: https://github.com/flannel-io/flannel/blob/master/pkg/backend/wireguard/wireguard.go
- Flannel WireGuard network source: https://github.com/flannel-io/flannel/blob/master/pkg/backend/wireguard/wireguard_network.go
- K3s embedded flannel setup source: https://github.com/k3s-io/k3s/blob/master/pkg/agent/flannel/setup.go
- K3s embedded flannel config path source: https://github.com/k3s-io/k3s/blob/master/pkg/executor/embed/embed.go
- `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- `wg(8)` reference: https://man7.org/linux/man-pages/man8/wg.8.html

## Issues Found
- The post treated the legacy `--flannel-backend=wireguard` backend as a current install option. I removed that path and kept `wireguard-native`, because K3s documents the legacy backend as unavailable in v1.26 and higher.
- The Step 1 RHEL/CentOS WireGuard installation commands did not match the official WireGuard installation guidance. I updated them to align with the official package and repository instructions.
- The interface verification commands relied on grepping generic `ip link` output for `wireguard`, which is unreliable. I replaced them with `wg show interfaces` and kept the documented `flannel-wg` interface check.
- The pod-to-pod verification example could race before the test Pods were ready. I added `kubectl wait` so the connectivity test runs after both Pods are Ready.
- The packet-capture example used `tcpdump ... | head`, which is not a reliable way to capture a fixed number of packets. I changed it to `tcpdump -c 20`.
- The WireGuard port section implied there was no supported way to override listen ports and omitted the IPv6 port. I corrected it to note the default ports and point to K3s `--flannel-conf` plus Flannel `ListenPort` and `ListenPortV6`.
- The `WireGuard NXT` section contained outdated wording and an irrelevant `flannel-ipv6-masq: false` line. I updated the section to reflect current `wireguard-native` usage in K3s.
- The log inspection command only covered the `k3s` service. I expanded it to include `k3s-agent`, since WireGuard and Flannel behavior may be logged there on agent nodes.
- The troubleshooting section used `nc -uzv` as if it were a reliable UDP connectivity test. I replaced it with socket and packet-capture checks that better reflect how WireGuard traffic is validated in practice.

## Review Notes
- Custom WireGuard listen port changes in K3s require a custom Flannel configuration file; the post now points to that mechanism but does not include a full custom `net-conf.json` example.
- Dual-stack or IPv6-enabled clusters may use both `flannel-wg` and `flannel-wg-v6`, and UDP 51821 must be allowed when IPv6 is enabled.
