# Validation Summary: How to Configure TeamSpeak Server with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TeamSpeak 3 Server (3.13.7)
- IPv6 networking
- Linux (systemd, useradd)
- ip6tables / iptables-persistent
- ss (socket statistics)
- nmap
- DNS (AAAA, SRV records)

## Sources Consulted
- TeamSpeak 3 Server documentation and download index — https://teamspeak.com / https://files.teamspeak-services.com/releases/server/
- TeamSpeak 3 Server INI / config directive reference (voice_ip, filetransfer_ip, query_ip, query_ssh_ip, default_voice_port, filetransfer_port, query_port, query_ssh_port)
- iptables-persistent / netfilter-persistent package documentation (Debian/Ubuntu) — `/etc/iptables/rules.v4` and `/etc/iptables/rules.v6`
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation — `2001:db8::/32`)
- RFC 5952 (Recommendation for IPv6 Address Text Representation — valid hex characters 0-9, a-f)
- systemd.service / systemd.unit man pages (Type=forking, PIDFile, Restart, network-online.target)
- ip6tables(8), ss(8), nmap(1) man pages

## Issues Found

1. **Invalid IPv6 example address `2001:db8::admin`** in the firewall rules section. The characters `m`, `i`, `n` are not valid hexadecimal digits, so this is not a syntactically valid IPv6 address and the `ip6tables` command would have failed if a user copy-pasted it. Replaced with `2001:db8::a` (a valid documentation-prefix address).

2. **Invalid IPv6 example address `2001:db8::ts3`** appearing in the verification commands (`nmap`, `telnet`) and the DNS section. The characters `t` and `s` are not valid hex digits, so the `nmap` and `telnet` commands would have failed for users following along. Replaced all occurrences with `2001:db8::1`.

3. **Wrong path for ip6tables-save output: `/etc/ip6tables/rules.v6`.** The `iptables-persistent` (and `netfilter-persistent`) package on Debian/Ubuntu uses `/etc/iptables/` (not `/etc/ip6tables/`) for both `rules.v4` and `rules.v6`. Corrected the path to `/etc/iptables/rules.v6`.

4. **Redundant/inconsistent IPv6 bracket notation in `ts3server.ini`.** The line `voice_ip=0.0.0.0,[::],::` contained both `[::]` and `::` (the same wildcard listed twice), and several other directives (`filetransfer_ip`, `query_ip`, `query_ssh_ip`) wrapped IPv6 addresses in `[...]` even though TeamSpeak's `voice_ip`-style settings take a comma-separated list of bare IP literals (brackets are reserved for the `[ipv6]:port` form). Normalized all the IPv6 entries to bare form (`::`, `::1`, `2001:db8::1`) and updated the IPv6-only and specific-address comment examples to match.

5. **Concluding paragraph referenced "bracket notation"** as a distinguishing feature of the IPv6 config — no longer accurate after fix #4. Reworded to describe the comma-separated address list, which is what the config actually uses.

## Review Notes
- TeamSpeak 3 Server 3.13.7 is the version pinned in the download command. TeamSpeak Systems has continued to publish patch releases, so the URL is correct for that specific version, but readers should check `files.teamspeak-services.com/releases/server/` for newer builds (the post already notes this).
- The systemd unit uses `Type=forking` with `PIDFile=/home/teamspeak/teamspeak/ts3server.pid`, which matches what `ts3server_startscript.sh` writes — correct.
- `query_ip=127.0.0.1,::1` restricts the raw query interface to localhost, which is the right safety default.
- The `2001:db8::/32` prefix is the IETF-reserved documentation prefix (RFC 3849), which is the correct choice for example addresses in published documentation.
- The author may wish to mention TeamSpeak's optional `tsdns` service or `_ts3._udp` SRV records more prominently — currently only a brief mention at the end. Not an error, just a future enhancement.
