# Validation Summary: How to Configure Asymmetric Routing with Reverse Path Filtering

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel IPv4 networking
- Reverse path filtering (`rp_filter`)
- `sysctl`
- `iproute2` policy routing (`ip route`, `ip rule`)
- Network diagnostics (`nstat`, `dmesg`)

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Linux kernel sysctl networking overview: https://docs.kernel.org/admin-guide/sysctl/net.html
- RFC 3704, Ingress Filtering for Multihomed Networks: https://datatracker.ietf.org/doc/rfc3704/
- Red Hat troubleshooting guidance for reverse path filtering and the `IPReversePathFilter` counter: https://access.redhat.com/solutions/53031
- Local command help and behavior checks: `sysctl --help`, `ip route help`, `ip rule help`, `nstat --help`, `dmesg --help`, `nstat -az | grep -i IPReversePathFilter`, `netstat -s | grep -i IPReversePathFilter`

## Issues Found
- The introduction and mode comments described strict-mode behavior as though it applied to `rp_filter` generally. I corrected the wording to match the kernel documentation and RFC 3704 distinction between strict and loose mode.
- The post incorrectly said `net.ipv4.conf.all.rp_filter` controls newly created interfaces. I changed this to `net.ipv4.conf.default.rp_filter` and clarified that Linux uses the higher of `conf.all` and the per-interface value for `rp_filter`.
- The policy-routing example only added default routes to custom tables, which is incomplete for a typical source-based routing setup. I added connected subnet routes and explicit `dev` bindings so the example reflects a workable per-table routing configuration.
- The `Diagnose rp_filter Drops` section used commands that do not directly show `rp_filter` drops. I replaced them with `nstat` for the `IPReversePathFilter` counter, `ip route get` to inspect the reverse path decision, and `log_martians` plus `dmesg --follow` for packet-level diagnostics.

## Review Notes
- `rp_filter` is an IPv4 setting; IPv6 source-validation behavior is handled differently.
- The kernel default for `rp_filter` is `0`, but some Linux distributions override it during boot. The post’s general guidance is valid without pinning to a distro-specific default.
- Reading kernel logs with `dmesg` may require elevated privileges on systems that restrict unprivileged access to the ring buffer.
