# Validation Summary: How to Configure Dual-Stack IPv4/IPv6 Networking on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- IPv4
- IPv6
- Netplan
- ifupdown (`/etc/network/interfaces`)
- `iproute2`
- `sysctl`
- `ping`
- `curl`
- `host` (BIND DNS utilities)

## Sources Consulted
- Netplan CLI documentation: https://netplan.readthedocs.io/en/stable/cli/
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Debian `interfaces(5)` man page: https://manpages.debian.org/bullseye/ifupdown/interfaces.5.en.html
- Debian `ip(8)` man page: https://manpages.debian.org/trixie/iproute2/ip.8.en.html
- Debian `ip-address(8)` man page: https://manpages.debian.org/trixie/iproute2/ip-address.8.en.html
- Debian `sysctl(8)` man page: https://manpages.debian.org/man/sysctl
- Debian `host(1)` man page: https://manpages.debian.org/buster/bind9-host/host.1.en.html
- curl man page: https://curl.se/docs/manpage.html
- Linux kernel IPv6 documentation: https://www.kernel.org/doc/html/latest/networking/ipv6.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 4213, Basic Transition Mechanisms for IPv6 Hosts and Routers: https://www.rfc-editor.org/rfc/rfc4213.html
- RFC 6724, Default Address Selection for Internet Protocol Version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc6724
- RFC 8305, Happy Eyeballs Version 2: Better Connectivity Using Concurrency: https://www.rfc-editor.org/rfc/rfc8305.html

## Issues Found
- The `netplan` command order was wrong. The post said `netplan apply` and then `netplan try` with a comment saying to test before applying. I changed the commands so `netplan try` appears first and clarified that `apply` is the direct, non-rollback option, matching Netplan's documented behavior.
- The IPv6 check used `conf/all/disable_ipv6` as if it directly reported whether IPv6 was disabled. Kernel documentation states that reading `conf/all/disable_ipv6` does not have a definitive meaning for runtime state, so I changed the check to the interface-specific flag and added a note that `ipv6.disable=1` requires removing that boot/module setting and rebooting.
- The `ip addr show eth0` verification command was updated to `ip addr show dev eth0` to match the documented `ip address show` syntax.
- The `curl` explanation incorrectly claimed curl prefers IPv6 by default. I changed it to describe the commands accurately as forcing IPv4 or IPv6, consistent with curl's documented `--ipv4` and `--ipv6` options.
- The introduction and conclusion overstated how dual-stack is "recommended" and how applications "prefer IPv6 when available." I corrected this to align with RFC 4213, RFC 6724, and RFC 8305, which describe dual stack as a transition mechanism and leave address selection to system policy and application behavior.
- The conclusion said dual stack requires "no special transition mechanisms," which is inaccurate because dual stack is itself a transition mechanism. I corrected the wording to say both protocols run natively on the same host without protocol translation on that host.

## Review Notes
- The examples consistently use `eth0`, but many modern Linux distributions use predictable interface names such as `ens3` or `enp0s3`.
- Appending settings to `/etc/sysctl.conf` is valid, but some distributions prefer placing persistent kernel tunables in `/etc/sysctl.d/*.conf`.
