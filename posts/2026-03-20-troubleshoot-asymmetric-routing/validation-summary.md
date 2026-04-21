# Validation Summary: How to Troubleshoot Asymmetric Routing Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- IPv4 routing and asymmetric routing
- Linux traceroute
- Linux iproute2 (`ip route`, `ip rule`, routing tables)
- Linux reverse path filtering (`rp_filter`)
- Netfilter/iptables connection tracking
- conntrack-tools
- HTTP testing with `curl`

## Sources Consulted
- Linux kernel IP sysctl documentation for `rp_filter`: https://docs.kernel.org/6.12/networking/ip-sysctl.html
- iproute2 `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- iproute2 `ip-rule(8)` manual page: https://man7.org/linux/man-pages/man8/ip-rule.8.html
- Linux `traceroute(8)` manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- iptables extensions manual page for conntrack states: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Netfilter conntrack-tools `conntrack(8)` manual page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- RFC 3704, Ingress Filtering for Multihomed Networks: https://www.rfc-editor.org/rfc/rfc3704.html
- RFC 2992, Analysis of an Equal-Cost Multi-Path Algorithm: https://www.rfc-editor.org/rfc/rfc2992.html
- Local command help output for `ip route help`, `ip rule help`, and `sysctl --help`

## Issues Found
- The introduction implied that connection tracking itself drops packets when it sees only one side of a flow. Updated the wording to make the drop behavior depend on stateful firewall policies built on conntrack.
- The `ip route get` reverse-path example did not explicitly say it must be run from the reverse-side host. Updated the comments to show the first lookup is from host A and the reverse lookup is from host B.
- The common-cause list described "ECMP without flow tracking." ECMP commonly uses a hash over flow-identifying header fields, while asymmetric paths can still result from ECMP or from per-packet load balancing. Updated the wording to "ECMP or per-packet load balancing."
- The firewall section said to configure iptables to accept `RELATED/ESTABLISHED` traffic regardless of direction, but stateful firewall rules still require conntrack state and cannot fix a topology where one direction bypasses the firewall. Updated the paragraph to distinguish conntrack behavior from Linux reverse path filtering.
- The `rp_filter` example mixed disabling reverse path filtering with loose mode, and Linux uses the maximum of `conf/all` and the interface value. Replaced the snippet with a loose-mode example using `rp_filter=2` for both `all` and `eth0`, plus commented commands for fully disabling reverse path filtering.
- The conntrack verification comment implied that `conntrack -L | grep ...` alone confirms bidirectional state. Updated the comment to say the TCP flow should not be marked `[UNREPLIED]`.

## Review Notes
The commands are Linux-specific and several require root privileges. The policy routing example is syntactically valid, but production configurations should persist `ip rule`, `ip route`, and `sysctl` changes through the host's network configuration system rather than relying on one-time shell commands.
