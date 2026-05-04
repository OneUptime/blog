# Validation Summary: How to Configure rsync over IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- rsync (file transfer/sync utility)
- rsyncd (rsync daemon, rsyncd.conf)
- SSH / OpenSSH client config (`~/.ssh/config`, `AddressFamily inet6`)
- IPv6 addressing and bracket notation (RFC 3986, RFC 5952)
- ip6tables (Netfilter for IPv6)
- iptables-persistent / netfilter-persistent
- systemd (`systemctl enable --now`)
- ss (socket statistics utility)
- Bash scripting

## Sources Consulted
- rsync(1) man page — IPv6 flag (`-6`/`--ipv6`), host:path parsing, daemon URL syntax
- rsyncd.conf(5) man page — `address`, `hosts allow`, `auth users`, `secrets file`, `read only`, `list` parameters and IPv6 forms
- ssh_config(5) — `AddressFamily inet6`, `HostName`, `IdentityFile`
- ip6tables(8) and ip6tables-save(8) man pages
- Debian/Ubuntu iptables-persistent package documentation (rules path: `/etc/iptables/rules.v6`)
- RFC 3986 (URI generic syntax — IPv6 literal bracket notation)
- RFC 3849 (the `2001:db8::/32` documentation prefix)

## Issues Found
1. **Unbracketed IPv6 literal in rsync-over-SSH example.** The third example under "rsync over SSH with IPv6" used `user@2001:db8::1:/remote/data/` with `-e "ssh -6"`. The `-6` flag tells `ssh` to prefer IPv6 sockets but does not change how rsync parses its `[USER@]HOST:SRC` argument. rsync treats the first `:` after the host as the host/path separator, so an unbracketed IPv6 literal is parsed incorrectly. Fixed to `user@'[2001:db8::1]':/remote/data/` (matching the bracket-quoted style used elsewhere in the post).
2. **Wrong iptables-persistent rules directory.** The save command targeted `/etc/ip6tables/rules.v6`, which is not a standard location. The Debian/Ubuntu `iptables-persistent`/`netfilter-persistent` package uses `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`. Fixed to `/etc/iptables/rules.v6`.

## Review Notes
- `address = ::` in `rsyncd.conf` listens on the IPv6 wildcard. On Linux with the default `net.ipv6.bindv6only = 0`, this also accepts IPv4 connections via IPv4-mapped IPv6 addresses; on systems where `bindv6only = 1`, it is IPv6-only. The post's comment ("Listen on all interfaces including IPv6") is acceptable but slightly imprecise — a future revision could clarify dual-stack behavior.
- The systemd unit name `rsync` matches Debian/Ubuntu. On RHEL/Fedora/CentOS Stream the unit is typically `rsyncd.service`. Distro-specific but not incorrect for the implied Debian-family context.
- The `hosts allow = 2001:db8::/32` example permits the entire IANA documentation prefix; in production users should narrow this to their actual subnet. This is illustrative and acceptable for a documentation-prefix example.
- The plaintext password in `/etc/rsyncd.secrets` (`SecurePassword123`) is intentionally illustrative; the `chmod 600` is correct and required by rsyncd.
- `rsync://[2001:db8::1]/backup/` (URL form) and `[2001:db8::1]::backup/` (double-colon daemon form) are both valid rsync IPv6 daemon syntaxes.
