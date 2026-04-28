# Validation Summary: How to Use Network Namespaces for IPv4-Only Connectivity Testing

## Status
validated

## Post Type
Tutorial / Technical How-To Guide

## Technologies Covered
- Linux network namespaces (`ip netns`)
- iproute2 (`ip` command suite)
- veth (virtual ethernet) pairs
- IPv4 / IPv6 (sysctl `net.ipv6.conf.*.disable_ipv6`)
- `tc` / `netem` traffic control for network emulation
- `dig` DNS lookup utility
- `curl` HTTP client
- Python `http.server` module

## Sources Consulted
- `ip-netns(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip-netns.8.html
- `ip-link(8)` man page (veth interfaces): https://man7.org/linux/man-pages/man8/ip-link.8.html
- `veth(4)` man page: https://man7.org/linux/man-pages/man4/veth.4.html
- `tc-netem(8)` man page: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Linux kernel documentation `Documentation/networking/ip-sysctl.rst` (disable_ipv6 semantics)
- Linux kernel `net/ipv6/addrconf.c` `init_loopback` (auto-assignment of `::1/128` on loopback)
- `resolv.conf(5)` and RFC 3596 (DNS AAAA records)

## Issues Found

1. **Misleading "no IPv6 by default" verification comment.** The original code ran `ip -6 addr show` immediately after `ip link set lo up` and asserted the output would be empty (`# (empty - good)`). This is incorrect: when the loopback interface is brought up in a fresh namespace with default IPv6 settings, the kernel's IPv6 addrconf code (`init_loopback` in `net/ipv6/addrconf.c`) automatically assigns `::1/128` to `lo`, so the command will show that address. Updated the comment to clarify that only the loopback's `::1/128` is expected, which the kernel adds automatically.

2. **Incorrect AAAA DNS resolution claim.** The original code commented `# Should not resolve if no IPv6` next to `dig +short example.com AAAA`. This is technically wrong: `disable_ipv6=1` only prevents the kernel from assigning/using IPv6 addresses on interfaces; it does not filter DNS payloads. The `dig` query travels to a DNS server over IPv4/UDP-53 and the server returns AAAA records as opaque DNS data regardless of local IPv6 status. example.com has AAAA records and `dig` will print them. Updated the comment to clarify that DNS resolution is unaffected by local IPv6 disablement and that only application connection attempts to IPv6 addresses will fail.

## Review Notes

- The `tc qdisc add dev veth-ns4 root netem delay 100ms 20ms loss 2%` syntax is correct per `tc-netem(8)` (mean 100ms, jitter 20ms, 2% loss).
- The `/30` subnet for the point-to-point veth link is correct (provides exactly two usable host addresses).
- The cleanup claim that "veth pair is automatically deleted when namespace is removed" is correct: deleting the namespace destroys `veth-ns4`, and per the veth driver, destroying one end of a veth pair automatically unregisters its peer.
- The "Testing Application Behavior" section assumes outbound internet connectivity from inside the namespace (e.g., `curl http://example.com`). For this to work in practice, the host typically needs IP forwarding enabled (`net.ipv4.ip_forward=1`) and a NAT rule (e.g., `iptables -t nat -A POSTROUTING -s 10.99.0.0/30 -j MASQUERADE`). The post does not cover these prerequisites; readers attempting to follow the external HTTP/DNS examples may need to add them. This is a coverage gap rather than a technical error in the commands shown, so it was left as-is per the "fix only technical errors" guidance.
- DNS inside the namespace: `ip netns exec` bind-mounts `/etc/netns/<name>/resolv.conf` over `/etc/resolv.conf` if it exists; otherwise the host's resolv.conf remains visible. Default behavior is therefore usually fine and the post's assumption is reasonable.
