# Validation Summary: How to Configure DNS Servers and Search Domains on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu networking
- DNS resolution
- systemd-resolved
- resolvectl
- Netplan
- NetworkManager / nmcli
- dig and nslookup

## Sources Consulted
- Netplan YAML configuration documentation: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan CLI manual: local `netplan(8)` man page
- systemd `resolved.conf` manual: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html and local `resolved.conf(5)` man page
- systemd `resolvectl` manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html and local `resolvectl(1)` man page
- NetworkManager nmcli settings reference: https://www.networkmanager.dev/docs/api/latest/nm-settings-nmcli.html

## Issues Found
- The DHCP Netplan example said static `nameservers` override DHCP-provided DNS servers, but Netplan's `use-dns` default is `true`, and DHCP DNS servers take precedence over statically configured ones. Added `dhcp4-overrides: use-dns: false` to make the override behavior accurate.
- The `systemd-resolved` direct configuration section described `DNS=` as fallback DNS. In `resolved.conf`, `DNS=` configures system DNS servers; `FallbackDNS=` is the fallback setting. Updated the section wording and comments to describe `DNS=` correctly.
- The per-interface DNS example used `vpn0` under Netplan `ethernets` and described route-only behavior while using a normal search domain. Changed the example to an internal Ethernet interface and used a `~internal.company.com` route-only domain.
- The `resolvectl query --legend webserver.example.com` command was syntactically incorrect because `--legend` expects a boolean argument. Updated it to `--legend=yes`.

## Review Notes
- The article is technically relevant and covers current Ubuntu DNS tooling. Some environments, especially desktop systems, may have NetworkManager-managed Netplan files rather than direct `networkd` server-style configuration, but the post already distinguishes server and desktop paths.
