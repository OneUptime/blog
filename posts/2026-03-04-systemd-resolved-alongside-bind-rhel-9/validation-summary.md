# Validation Summary: How to Use systemd-resolved Alongside BIND on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd-resolved
- BIND 9
- NetworkManager
- DNS resolver configuration

## Sources Consulted
- Red Hat Enterprise Linux 9 Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- systemd resolved.conf documentation: https://www.freedesktop.org/software/systemd/man/257/resolved.conf.html
- systemd-resolved service documentation: https://www.freedesktop.org/software/systemd/man/249/systemd-resolved.html
- NetworkManager.conf reference: https://networkmanager.dev/docs/api/latest/NetworkManager.conf.html
- nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- NetworkManager daemon reference: https://www.networkmanager.dev/docs/api/1.40/NetworkManager.html
- BIND 9 configuration reference: https://bind9.readthedocs.io/en/v9.18.4/reference.html

## Issues Found
- Corrected the explanation of `FallbackDNS=`. The post described it as a resolver for all non-matching domains, but systemd-resolved only uses fallback DNS servers when no other DNS server information is known.
- Clarified that `DNS=` in global `resolved.conf` configures a global DNS server. Route-only domains such as `~example.com` influence routing preference, but the global BIND server can still be used for other multi-label DNS queries.
- Added `mkdir -p /etc/systemd/resolved.conf.d` before writing an Option 3 drop-in so the command works when the directory does not already exist.
- Replaced `nmcli general | grep -i dns` with `NetworkManager --print-config | grep -E '^(dns|rc-manager)='` because `nmcli general` reports general NetworkManager status and does not show the effective DNS mode.

## Review Notes
RHEL 9 documentation identifies `systemd-resolved` as a Technology Preview feature and says Red Hat does not recommend Technology Preview features for production. The post's recommendation to disable systemd-resolved on dedicated BIND servers is consistent with that caveat.
