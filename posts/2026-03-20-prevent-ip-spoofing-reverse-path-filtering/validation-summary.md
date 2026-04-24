# Validation Summary: How to Prevent IP Spoofing with Reverse Path Filtering on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux kernel `rp_filter`
- Linux `sysctl`
- Linux networking
- `iptables`
- `nstat`

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.12/networking/ip-sysctl.html
- RFC 3704, *Ingress Filtering for Multihomed Networks*: https://www.rfc-editor.org/rfc/rfc3704
- Local `sysctl --help` output
- Local `iptables -h` output
- Local `nstat -h` output
- Local `/proc/net/netstat` counter names
- Author link check: https://github.com/nawazdhandala

## Issues Found
- The description and introduction overstated what `rp_filter` does in all modes. I corrected them to describe source validation generally and strict-mode interface matching specifically.
- The loose-mode comment incorrectly claimed it still catches spoofed private/bogon IPs. I changed it to match RFC 3704 and kernel documentation: loose mode only checks that the source is reachable via some interface.
- The verification section used `ip -s route show` and `IpInAddrErrors`, which are not the right indicators for reverse-path filtering drops. I replaced them with `nstat -az TcpExtIPReversePathFilter`, which reports the kernel counter for reverse-path filter drops on this system.
- The caveat example said setting `net.ipv4.conf.eth1.rp_filter=0` disables RPF on one interface even when `net.ipv4.conf.all.rp_filter=1`. Linux uses the maximum of `conf/all/rp_filter` and `conf/<iface>/rp_filter`, so I corrected the example to lower `all` to `0` and enable strict mode only on the interfaces that should enforce it.
- The closing sentence was softened from an absolute claim to technically accurate wording that reflects `rp_filter` as a source-validation control.

## Review Notes
- The post is accurate for Linux IPv4 `rp_filter`; it does not cover IPv6 source-validation mechanisms.
- `iptables` syntax is correct, but modern distributions may implement it through the nftables backend (`iptables v1.8.10 (nf_tables)` on this system).
- For policy-routing setups that rely on `fwmark`, the related kernel setting `net.ipv4.conf.*.src_valid_mark` may also matter; that is not covered in this post.
