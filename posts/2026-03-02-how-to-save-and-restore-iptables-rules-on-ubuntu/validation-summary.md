# Validation Summary: How to Save and Restore iptables Rules on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- iptables / ip6tables
- iptables-save and iptables-restore
- iptables-persistent / netfilter-persistent
- systemd (custom service unit, service management)
- Ubuntu (apt package management)
- ifupdown (`/etc/network/if-pre-up.d/` hooks)
- bash scripting

## Sources Consulted
- iptables-restore(8) man page (iptables 1.8.10) — verified `-t/--test`, `-c/--counters`, `-n/--noflush`, `-w/--wait`, `-T/--table` flags
- Verified `/sbin/iptables-restore` exists on modern Ubuntu as a symlink to `/etc/alternatives/iptables-restore`
- apt-cache info for `iptables-persistent` package (Version 1.0.20) — confirmed Pre-Depends on `iptables` and Depends on `netfilter-persistent`
- Debian netfilter-persistent package documentation (https://manpages.debian.org/testing/netfilter-persistent/netfilter-persistent.8.en.html) — verified `save` and `reload` subcommands
- systemd.special(7) for `network-pre.target` semantics — confirmed `Before=network-pre.target` + `Wants=network-pre.target` is the documented pattern for firewall services
- iptables-save(8) man page — verified output format

## Issues Found
No technical issues found.

## Review Notes
- The post uses the `state` match module (`-m state --state ESTABLISHED,RELATED`) in examples. The newer recommended module is `conntrack` (`-m conntrack --ctstate`), but `state` is still supported as a backward-compatible alias and remains widely used in documentation, so the examples are not incorrect.
- The `iptables-save v1.8.7` version in the example header is plausible for Ubuntu 22.04 LTS (which ships iptables 1.8.7). Ubuntu 24.04 LTS ships 1.8.10. The post does not pin to a specific Ubuntu release, so this is fine.
- The `if-pre-up.d` approach (Method 3) is correctly described as "older but still functional" — it depends on ifupdown, which is no longer the default on modern Ubuntu desktop/server (netplan + systemd-networkd or NetworkManager are the defaults). The post acknowledges this caveat.
- The custom systemd unit in Method 2 correctly uses `Before=network-pre.target` and `Wants=network-pre.target`, matching the documented pattern for firewall ordering.
- The rule-count one-liner `iptables -L --line-numbers | grep "^[0-9]" | wc -l` works because `--line-numbers` prefixes each rule with its index; this counts rules across all listed chains, which is reasonable for a status echo.
- `ssh -o ConnectTimeout=5 localhost true` requires an SSH server running on localhost and a working auth method (key-based or password); on a fresh server without these set up it will fail. This is a minor caveat but the intent (verifying SSH is still reachable after applying a restrictive ruleset) is sound.
