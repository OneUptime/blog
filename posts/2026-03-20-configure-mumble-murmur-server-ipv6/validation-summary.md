# Validation Summary: How to Configure Mumble/Murmur Server with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Mumble / Murmur (mumble-server) voice server
- IPv6 networking
- systemd service management
- ip6tables / iptables-persistent
- Murmur Ice management interface (mumble-server-cli)
- Linux CLI utilities (ss, nc, nmap)
- DNS AAAA records

## Sources Consulted
- [Mumble Wiki — Running Murmur](https://wiki.mumble.info/wiki/Running_Murmur)
- [Mumble Wiki — Murmurguide](https://wiki.mumble.info/wiki/Murmurguide)
- [mumble-voip/mumble — auxiliary_files/mumble-server.ini (upstream default config)](https://github.com/mumble-voip/mumble/blob/master/auxiliary_files/mumble-server.ini)
- [Ubuntu Manpage — mumble-server-cli(1)](https://manpages.ubuntu.com/manpages/trusty/man1/mumble-server-cli.1.html)
- [Debian Manpage — mumble-server-cli(1)](https://www.unix.com/man-page/debian/1/MUMBLE-SERVER-CLI/)
- [Mumble — Server Configuration to Enable Ice](https://www.mumble.info/documentation/mumble-server/scripting/ice/server-setup/)
- [Linuxiac — How to Make iptables Firewall Rules Persistent on Debian/Ubuntu](https://linuxiac.com/persistent-iptables-firewall-rules/)
- [Arch Wiki — Mumble](https://wiki.archlinux.org/title/Mumble)
- RFC 3849 (IPv6 Address Prefix for Documentation: 2001:db8::/32)

## Issues Found
1. **Invalid IPv6 placeholder address `2001:db8::mumble`** — IPv6 addresses are hexadecimal (0–9, a–f) only. The characters `m`, `u`, and `l` are not valid hex, so `2001:db8::mumble` is syntactically invalid and would fail in `nc`, `nmap`, and as an `AAAA` record value. Replaced all occurrences with `2001:db8::1` (RFC 3849 documentation prefix).
2. **Incorrect `host=` directive syntax for dual-stack** — The post claimed `host=0.0.0.0,::` (comma-separated) was supported. Per the upstream `mumble-server.ini` template, the `host` directive accepts a single IP or hostname only; leaving it blank is the documented mechanism for binding to all addresses (which includes IPv6 on dual-stack systems). Rewrote the "Enabling Dual-Stack" section to reflect correct behavior and noted that listening on multiple specific addresses requires multiple Murmur instances.
3. **Wrong iptables-persistent rules path** — The post saved IPv6 rules to `/etc/ip6tables/rules.v6`, which does not exist. The iptables-persistent / netfilter-persistent package on Debian/Ubuntu uses `/etc/iptables/rules.v6`. Corrected the path and added a note about the iptables-persistent dependency.
4. **Incorrect `mumble-server-cli` invocation** — The post invoked `mumble-server-cli -ini /etc/mumble-server.ini`. Per the man page, `mumble-server-cli` does not accept an `-ini` flag; it connects to the server via Ice using a connection string (`-c`). Replaced with `sudo mumble-server-cli -c "Meta:tcp -h 127.0.0.1 -p 6502"` and noted that Ice must be enabled in `mumble-server.ini` first.

## Review Notes
- The default Mumble port `64738` (TCP for control + UDP for voice) is correct.
- The default per-user `bandwidth=72000` (bits/s) and `opusthreshold=100` values match upstream defaults.
- `murmurd --version` is the correct binary name on Debian/Ubuntu (where it is provided as a symlink/alternate name for `mumble-server`); on RHEL/CentOS via EPEL the package is named `murmur` and the binary is `murmurd`, so this works on both.
- `systemctl reload mumble-server`: the Debian/Ubuntu unit's reload behavior sends SIGUSR1, which Murmur primarily uses to reopen log files — not to apply arbitrary `mumble-server.ini` changes. Most config changes still require a full `restart`. Left as-is since the command itself is valid, but readers should be aware.
- `dpkg-reconfigure mumble-server` is the standard Debian/Ubuntu way to (re)set the SuperUser password and is correct.
- `2001:db8::/32` is the correct documentation prefix per RFC 3849; using it in examples is appropriate.
