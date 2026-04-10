# Validation Summary: How to Configure MTU Consistently Across Ceph Nodes

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Linux networking (`ip link`, `ping`, `netstat`)
- NetworkManager (`nmcli`)
- systemd-networkd
- Kubernetes DaemonSet
- Bash scripting

## Sources Consulted
- Linux `ip-link(8)` man page — `ip link set` syntax and MTU option
- Linux `ping(8)` man page — `-M do` (prohibit fragmentation), `-s` (packet size)
- `nmcli(1)` man page — `connection modify` with `802-3-ethernet.mtu` property
- `systemd.network(5)` man page — `[Link]` section `MTUBytes=` directive in `.network` files
- Kubernetes API reference — DaemonSet spec, initContainers, hostNetwork, securityContext
- Alpine Linux Docker Hub image documentation — base image does not include `iproute2`
- IP/ICMP header size: RFC 791 (IP, 20-byte header), RFC 792 (ICMP, 8-byte header) — confirms 28-byte overhead calculation for ping payload sizing

## Issues Found

1. **Alpine image missing `iproute2` package (DaemonSet initContainer)**: The DaemonSet used `alpine:3.18` as the initContainer image and ran `ip link set` commands. However, the base Alpine Docker image does not include the `ip` command (`iproute2` package), so the initContainer would fail at runtime. Fixed by adding `apk add --no-cache iproute2` before the `ip link set` commands.

2. **Misleading comment about path MTU discovery**: The comment "If this fails, path MTU discovery is not working" after the `ping -M do -s 8972` command was technically incorrect. A failed large ping with the do-not-fragment flag set means the path does not support that frame size (some hop has a smaller MTU), not that the PMTUD mechanism itself is broken. Fixed the comment to: "If this fails, the path does not support 9000-byte frames."

## Review Notes
- The `gcr.io/google_containers/pause:3.1` image reference in the DaemonSet is functional but dated. The current canonical location is `registry.k8s.io/pause:3.9` (or later). Not a correctness issue, but worth updating in a future revision.
- The `netstat -s` command is deprecated on modern Linux in favor of `nstat` or `ss`, but it still works for viewing IP-level fragmentation statistics. Not changed since it remains functional.
- The MTU overhead calculations are correct: 9000 - 20 (IP) - 8 (ICMP) = 8972 for jumbo frames; 1500 - 20 - 8 = 1472 for standard frames.
- All `nmcli`, `ip link`, `systemd-networkd`, and Kubernetes YAML syntax is correct.
- The bash validation script is syntactically sound and correctly escapes the `awk` variable inside the SSH command.
