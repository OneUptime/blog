# Validation Summary: How to Use IFB Devices for Inbound IPv4 Traffic Shaping on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux traffic control (`tc`)
- IFB virtual interfaces
- `iproute2` commands (`ip`, `tc`)
- IPv4 packet classification with `u32`
- TBF and HTB queue disciplines

## Sources Consulted
- `tc(8)` iproute2 manpage: https://manpages.debian.org/testing/iproute2/tc.8.en.html
- `tc-tbf(8)` iproute2 manpage: https://manpages.debian.org/testing/iproute2/tc-tbf.8.en.html
- `tc-htb(8)` iproute2 manpage: https://manpages.debian.org/trixie/iproute2/tc-htb.8.en.html
- `tc-u32(8)` iproute2 manpage: https://manpages.debian.org/testing/iproute2/tc-u32.8.en.html
- `tc-mirred(8)` manual page: https://man7.org/linux/man-pages/man8/tc-mirred.8.html
- `modules-load.d(5)` systemd manual: https://www.freedesktop.org/software/systemd/man/latest/modules-load.d.html
- Linux Foundation IFB wiki: https://wiki.linuxfoundation.org/networking/ifb
- Local command help/man output checked in this environment: `ip link help ifb`, `modinfo ifb`, `tc qdisc add ... tbf help`, `tc class add ... htb help`

## Issues Found
- The TBF examples used `burst 32kbit`, but `tc-tbf(8)` defines `burst` in bytes, not bits. I changed both TBF examples to `burst 32kb`, which fixes the unit error and makes the bucket size reasonable for a 20 Mbit/s example.
- The boot-persistence example used `/etc/modules`, which is distro-specific for a generic Linux guide. I changed it to `/etc/modules-load.d/ifb.conf` and qualified it as applying to systemd-based systems.
- The HTB classifier example matched `ip sport 22` without explicitly constraining the packet to TCP. I changed it to match TCP explicitly with `match ip protocol 6 0xff` and `match tcp src 22 0xffff`.
- The verification download URL (`speedtest.wdc01.softlayer.com`) no longer resolves. I replaced it with a currently reachable test file URL: `https://proof.ovh.net/files/10Mb.dat`.

## Review Notes
- The post is intentionally IPv4-only as written because the ingress redirect filter uses `protocol ip`; IPv6 would require separate `protocol ipv6` filters and matching classifier rules.
- On some systems, creating an IFB link can autoload the module, but `modprobe ifb` remains valid and explicit.
