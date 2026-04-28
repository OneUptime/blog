# Validation Summary: How to Configure NAT on Linux Using iptables

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- iptables (netfilter framework)
- Linux NAT (MASQUERADE, SNAT, DNAT)
- IP forwarding (sysctl `net.ipv4.ip_forward`)
- conntrack (connection tracking)
- iptables-save / iptables-restore
- iptables-persistent (Debian/Ubuntu)

## Sources Consulted
- iptables(8) man page (netfilter.org)
- iptables-extensions(8) man page (covers MASQUERADE, SNAT, DNAT, state, conntrack)
- netfilter.org official documentation: https://www.netfilter.org/documentation/
- Linux kernel networking documentation on IP forwarding (Documentation/networking/ip-sysctl.txt)
- Debian/Ubuntu `iptables-persistent` package documentation
- conntrack-tools documentation

## Issues Found
No technical issues found.

All commands, flags, syntax, and explanations were verified against iptables and netfilter documentation:

- The NAT table chains (PREROUTING, OUTPUT, POSTROUTING) and their purposes are correctly described.
- MASQUERADE syntax (`iptables -t nat -A POSTROUTING ... -o eth1 -j MASQUERADE`) is correct — MASQUERADE requires an outgoing interface and dynamically uses its current IP.
- SNAT syntax with `--to-source` on POSTROUTING is correct.
- DNAT syntax with `--to-destination` on PREROUTING (including `IP:port` form) is correct.
- The accompanying FORWARD rules (with `-m state --state RELATED,ESTABLISHED`) are valid; the `state` match is still supported as an alias for the conntrack module.
- The 1:1 NAT example (paired DNAT + SNAT) is a correct bidirectional translation.
- `conntrack -L` is the correct command for viewing active NAT translations (provided by the conntrack-tools package).
- `iptables-save`/`iptables-restore` paths and the `iptables-persistent` / `netfilter-persistent save` workflow are correct for Debian/Ubuntu.
- The `sysctl -w net.ipv4.ip_forward=1` runtime command and the `/etc/sysctl.conf` persistent setting are both valid.
- The complete NAT gateway script is internally consistent: flush, MASQUERADE outbound, DNAT port-forward, default DROP on FORWARD with explicit ACCEPT rules.

## Review Notes
- The post uses `-m state --state RELATED,ESTABLISHED`. The `state` match has been deprecated in favor of `-m conntrack --ctstate RELATED,ESTABLISHED` for many years, but `state` remains supported as a thin wrapper and is widely seen in real-world deployments. Not a correctness issue, but a future revision could mention `conntrack` as the modern equivalent.
- On most modern distributions (RHEL 8+, Debian 11+, Ubuntu 22.04+), `iptables` is implemented via `iptables-nft` (using the nftables kernel backend) by default. Rules written with this guide still work, but readers on the newest systems may prefer the companion nftables guide referenced in "Related Reading".
- The `OUTPUT` chain in the nat table also supports DNAT for locally-generated packets (not just generic modification); this is implicit in the table description and not incorrect, just lightly described.
- The post does not mention the `INPUT` chain in the nat table (added in kernel 2.6.34); it is rarely used and its omission is reasonable for an introductory guide.
- Persisting `net.ipv4.ip_forward = 1` to `/etc/sysctl.conf` works, though many modern distributions prefer drop-ins under `/etc/sysctl.d/`. Both approaches are valid.
