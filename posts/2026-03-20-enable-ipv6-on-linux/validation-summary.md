# Validation Summary: How to Enable IPv6 on Linux Systems

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux IPv6 networking
- Linux kernel IPv6 parameters
- `sysctl`
- `iproute2` (`ip`)
- `iputils` (`ping`)
- `kmod` / `modprobe`
- GRUB kernel parameters

## Sources Consulted
- Linux kernel documentation, "IPv6": https://www.kernel.org/doc/html/latest/networking/ipv6.html
- Linux kernel documentation, "IP Sysctl": https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel documentation, "The kernel's command-line parameters": https://docs.kernel.org/admin-guide/kernel-parameters.html
- `sysctl(8)` man page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- `ip-address(8)` man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `modprobe(8)` man page: https://man7.org/linux/man-pages/man8/modprobe.8.html
- `modprobe.d(5)` man page: https://www.man7.org/linux/man-pages/man5/modprobe.d.5.html
- `modules-load.d(5)` man page: https://www.man7.org/linux/man-pages/man5/modules-load.d.5.html
- `ping(8)` man page: https://man7.org/linux/man-pages/man8/ping.8.html
- RFC 4862, "IPv6 Stateless Address Autoconfiguration": https://www.rfc-editor.org/rfc/rfc4862
- RFC 4291, "IP Version 6 Addressing Architecture": https://www.rfc-editor.org/rfc/rfc4291.html

## Issues Found
- The original check used `net.ipv6.conf.all.disable_ipv6` as if reading it directly showed whether IPv6 was enabled. Current Linux kernel documentation says reading `conf/all/disable_ipv6` is not a reliable enabled/disabled indicator. I replaced that with a `default.disable_ipv6` check plus a per-interface check.
- The post described `net.ipv6.conf.default.disable_ipv6` as applying to the "default interface". Kernel sysctl documentation defines `conf/default/*` as defaults for newly created interfaces. I corrected that wording.
- The verification examples used `ping6`. Current `ping(8)` documents `ping -6` and notes that the separate `ping6` binary was merged into `ping`. I updated the commands and summary to use `ping -6`.
- The verification section used `rdisc6` without noting that it is not part of the standard `iproute2`/`iputils` toolset on many systems. I replaced that check with `ip -6 route show default`, which is a standard way to verify that the host has an IPv6 default route.

## Review Notes
- The post remains generally accurate for modern Linux systems after the corrections above.
- I verified that `curl -6 https://ipv6.google.com` was still a valid IPv6 connectivity example on 2026-05-01, so that command was left unchanged.
