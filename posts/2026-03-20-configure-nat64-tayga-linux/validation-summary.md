# Validation Summary: How to Configure NAT64 with Tayga on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Tayga (userspace NAT64/SIIT daemon)
- Jool (mentioned for comparison)
- Linux TUN devices
- IPv6 / IPv4 (NAT64 transition mechanism)
- iptables (NAT/MASQUERADE/SNAT)
- systemd
- RFC 7915 (SIIT — Stateless IP/ICMP Translation)
- RFC 6052 (well-known prefix `64:ff9b::/96`)

## Sources Consulted
- Tayga man page (Debian testing): https://manpages.debian.org/testing/tayga/tayga.8.en.html
- Tayga man page (Ubuntu): https://manpages.ubuntu.com/manpages/jammy/man8/tayga.8.html
- RFC 7915 — IP/ICMP Translation Algorithm (SIIT): https://datatracker.ietf.org/doc/html/rfc7915
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators (defines the well-known `64:ff9b::/96` prefix)
- iptables man page (POSTROUTING / MASQUERADE / SNAT semantics)

## Issues Found
1. **Invalid `--show-dynamic-pool` flag.** The original post recommended `tayga --config /etc/tayga.conf --show-dynamic-pool` to inspect dynamic mappings. Tayga does not implement this option — the documented flags are `-c/--config`, `-d`, `-n/--nodetach`, `-u`, `-g`, `-r/--chroot`, `-p/--pidfile`, `--mktun`, and `--rmtun`. Dynamic mappings are persisted as files inside the configured `data-dir`. **Fix:** Replaced the command with `cat /var/db/tayga/dynamic.map`, which reads Tayga's actual on-disk mapping file in the data-dir defined earlier in the post.

## Review Notes
- The IPv4 host-side configuration uses `ip addr add 192.168.255.0/31 dev nat64` while Tayga's `ipv4-addr` is `192.168.255.1`. This works because RFC 3021 permits /31 on point-to-point links — the host gets `.0` and Tayga gets `.1`. It's an unconventional choice (most published Tayga examples use a /24 with the host taking a separate address such as `192.168.255.2/24`), but it is technically valid and was left as-is to preserve the author's style.
- The IPv6 line `ip -6 addr add 64:ff9b::192.168.255.1/96 dev nat64` adds the same IPv6 address Tayga itself derives from its `ipv4-addr` and prefix. In typical TUN-based Tayga setups, the kernel side simply needs the `64:ff9b::/96` route through the device (which the post also adds); assigning the same embedded address to the host interface is unusual but does not break translation in practice because Tayga reads/writes packets via the TUN file descriptor. Not changed.
- Tayga's project description ("stateless NAT64") is a slight simplification — when configured with `dynamic-pool`, Tayga maintains per-host IPv6→IPv4 mappings, which is effectively stateful at the address level (though it is still stateless at the L4/connection level, unlike Jool's stateful NAT64). The post's framing matches the project's own wording, so it was kept.
- `ping6` is deprecated on most modern Linux distributions in favor of `ping -6` (or `ping` with an IPv6 target), but `ping6` still works and is widely recognized in tutorials. Left unchanged.
- Tayga 0.9.2 is referenced as a build-from-source target. This was the last upstream release of the original litech.org Tayga before development effectively stalled; readers building from source today may want to look for community forks, though this is outside the scope of the post.
