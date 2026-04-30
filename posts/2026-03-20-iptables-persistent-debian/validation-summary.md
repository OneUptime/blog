# Validation Summary: How to Use iptables-persistent to Survive Reboots on Debian

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Debian
- iptables
- ip6tables
- iptables-persistent
- netfilter-persistent
- systemd

## Sources Consulted
- Debian package page for `iptables-persistent`: https://packages.debian.org/stable/iptables-persistent
- Debian manpage for `netfilter-persistent(8)`: https://manpages.debian.org/trixie/netfilter-persistent/netfilter-persistent.8.en.html
- Debian source for the `netfilter-persistent` launcher: https://sources.debian.org/src/iptables-persistent/1.0.23/netfilter-persistent
- Debian source for the IPv4 plugin `15-ip4tables`: https://sources.debian.org/src/iptables-persistent/1.0.23/plugins/15-ip4tables
- Debian source for the IPv6 plugin `25-ip6tables`: https://sources.debian.org/src/iptables-persistent/1.0.23/plugins/25-ip6tables
- Debian source for `iptables-persistent` debconf prompts: https://sources.debian.org/src/iptables-persistent/1.0.23/debian/iptables-persistent.templates
- Debian manpage for `iptables-save(8)`: https://manpages.debian.org/trixie/iptables/iptables-save.8.en.html
- Debian manpage for `iptables-extensions(8)`: https://manpages.debian.org/trixie/iptables/iptables-extensions.8.en.html

## Issues Found
- The direct-save examples used shell redirection with `sudo` (`sudo iptables-save > /etc/iptables/rules.v4` and the IPv6 equivalent), which would not reliably write to root-owned files. These were changed to the documented `-f` form supported by `iptables-save` and `ip6tables-save`.
- The post described `/etc/init.d/netfilter-persistent save` as an "`iptables-save` command alias". It is actually the SysV init script wrapper for `netfilter-persistent`, so the wording was corrected.
- The `systemctl stop netfilter-persistent` explanation was incorrect. On Debian, `netfilter-persistent stop` only flushes rules when `FLUSH_ON_STOP` is enabled; otherwise it prints a warning. The post now distinguishes stopping the service from explicitly flushing rules.
- The boot verification example only flushed part of the live IPv4 ruleset with raw `iptables` commands. It was updated to use `netfilter-persistent flush` followed by `netfilter-persistent start`, which matches the package's own plugin-driven behavior.
- The example firewall rule set dropped all inbound traffic except ports 22 and 80 without allowing loopback traffic or `ESTABLISHED,RELATED` connections. It was updated so the example remains functional for normal host networking.

## Review Notes
`netfilter-persistent(8)` documents `start`, `stop`, `flush`, and `save`; the shipped launcher also accepts `reload` and `restart` as aliases to `start`, as shown in the Debian source.
