# Validation Summary: How to Configure DNS Settings with NetworkManager on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NetworkManager
- nmcli
- DNS and `/etc/resolv.conf`
- `dnsmasq`
- `systemd-resolved`
- `/etc/hosts` and NSS name resolution

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring and managing networking, DNS server ordering and split DNS behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- NetworkManager `nm-settings-nmcli` reference for `ipv4.dns`, `ipv4.dns-search`, `ipv4.dns-priority`, and `ipv4.dns-options`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager `NetworkManager.conf` reference for `dns`, `global-dns`, and `global-dns-domain-*`: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/NetworkManager.conf.html
- Local system man pages: `nmcli(1)`, `nm-settings-nmcli(5)`, `NetworkManager.conf(5)`, `NetworkManager(8)`, and `resolv.conf(5)`

## Issues Found
- The DNS priority section described `0` as a standard default priority and implied route metric was the general tiebreaker. Updated it to explain that `0` selects the global default priority, and that NetworkManager defaults to `50` for VPN connections and `100` for other connections when no global default is set.
- The negative DNS priority description said only the current connection's DNS servers are used. Updated it to match NetworkManager behavior: only DNS servers from connections with the lowest priority value are used.
- The post said DNS priority controls which servers appear first in `/etc/resolv.conf` without limiting that statement to the default DNS mode. Updated the wording to specify that this ordering applies when using the default DNS mode.
- The command `nmcli general | grep DNS` does not show the configured DNS processing mode. Replaced it with `NetworkManager --print-config | grep -E '^(# )?dns='`.
- The split DNS section did not mention that conditional forwarding requires a supporting resolver plugin. Added the `dns=dnsmasq` or `dns=systemd-resolved` caveat.

## Review Notes
The examples focus on IPv4 properties. On dual-stack systems, equivalent `ipv6.dns`, `ipv6.dns-search`, `ipv6.dns-priority`, and `ipv6.dns-options` settings may also be needed.
