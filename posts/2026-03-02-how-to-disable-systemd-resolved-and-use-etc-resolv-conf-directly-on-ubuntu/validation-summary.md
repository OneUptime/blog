# Validation Summary: How to Disable systemd-resolved and Use /etc/resolv.conf Directly on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd-resolved
- systemd-networkd
- Netplan
- NetworkManager
- ISC dhclient
- `/etc/resolv.conf`
- DNS resolver configuration

## Sources Consulted
- Ubuntu manpage for systemd-resolved: https://manpages.ubuntu.com/manpages/noble/en/man8/systemd-resolved.service.8.html
- Ubuntu Server documentation for network configuration and name resolution: https://ubuntu.com/server/docs/explanation/networking/configuring-networks/
- Ubuntu Server DNSSEC documentation: https://ubuntu.com/server/docs/explanation/dnssec/dnssec/
- systemd.network manual: https://www.freedesktop.org/software/systemd/man/254/systemd.network.html
- NetworkManager.conf reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- Linux resolv.conf(5) manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- ISC DHCP dhclient.conf manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- Local Ubuntu/Linux man pages for `systemd-resolved`, `systemd.network`, `NetworkManager.conf`, `resolv.conf`, and `chattr`

## Issues Found
- The post described Option 1 as "Disable Stub Resolver", but changing `/etc/resolv.conf` to `/run/systemd/resolve/resolv.conf` bypasses the stub for direct DNS clients rather than disabling the stub listener. Updated the heading and explanation.
- The post implied that direct `/etc/resolv.conf` clients still receive `systemd-resolved` features such as caching, DNSSEC validation, and per-interface routing when using `/run/systemd/resolve/resolv.conf`. The systemd-resolved documentation states that clients using that file bypass the local resolver. Updated the explanation to clarify the tradeoff.
- The post said `systemd-resolved` provides DNSSEC without caveat. Ubuntu documentation notes DNSSEC validation support exists but is disabled by default. Updated the wording to "DNSSEC support".
- The Netplan/systemd-networkd section incorrectly claimed that `systemd-networkd` can write `/run/systemd/network/resolv.conf` directly and that linking `/etc/resolv.conf` there configures the resolver. Official systemd.network documentation says `DNS=` and `Domains=` are read by `systemd-resolved`; there is no supported `/run/systemd/network/resolv.conf` target. Replaced that snippet with a static `/etc/resolv.conf` approach when `systemd-resolved` is disabled.

## Review Notes
- The static `/etc/resolv.conf`, NetworkManager `dns=none`, `dhclient` `supersede`, `chattr +i`, and revert commands are technically valid, but disabling `systemd-resolved` on modern Ubuntu can conflict with distro defaults and should be treated as an intentional advanced configuration.
