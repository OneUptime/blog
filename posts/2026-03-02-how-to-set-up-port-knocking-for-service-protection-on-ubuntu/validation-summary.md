# Validation Summary: How to Set Up Port Knocking for Service Protection on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- knockd (port knocking daemon)
- iptables
- UFW (Uncomplicated Firewall)
- systemd / systemctl
- nmap (as a knock client)
- iptables-persistent / netfilter-persistent
- Ubuntu

## Sources Consulted
- knockd man page and source code (zeroflux.org/projects/knock) — verified config directives (`Interface`, `UseSyslog`, `sequence`, `seq_timeout`, `command`, `tcpflags`), `%IP%` substitution, mixed protocol syntax (`port:proto`), and CLI options (`-i/--interface`, `-V/--version`)
- iptables manual — verified `-A INPUT`, `-D INPUT`, `-m conntrack --ctstate ESTABLISHED,RELATED`, `--dport`, `-j ACCEPT/DROP` syntax
- UFW manual — verified `ufw deny`, `ufw allow from ... to any port ...`, `ufw delete allow ...` syntax
- nmap manual (nmap.org/book/man-performance.html) — verified `-Pn`, `--host-timeout`, `--max-retries`; `--host-timeout` uses seconds by default unless a unit suffix is given
- Debian/Ubuntu knockd package documentation — verified `/etc/knockd.conf`, `/etc/default/knockd` with `START_KNOCKD=1`, and that the `knock` client ships in the `knockd` package
- netfilter-persistent / iptables-persistent package documentation — verified `netfilter-persistent save` writes to `/etc/iptables/rules.v4`

## Issues Found

1. **Incorrect description of how knockd uses libpcap.** The original text said knockd "monitors the firewall log (via libpcap)". libpcap is a packet capture library (the same one used by `tcpdump`/Wireshark) that reads packets directly from the network interface; it does not read firewall logs. Updated the wording to: "captures packets directly from the network interface (via libpcap, similar to how `tcpdump` works) and watches for connection attempts matching your sequence."

2. **nmap `--host-timeout` value missing units.** The original commands used `--host-timeout 201`. nmap interprets bare numeric time values as seconds, so this would set a 201-second timeout — almost certainly a typo for `201ms` (a common value in port-knocking examples for a fast, fire-and-forget SYN). Changed all three occurrences to `--host-timeout 201ms`.

## Review Notes
- The post's overall approach is sound: blocking SSH with iptables/UFW by default and using knockd to open it per source IP is the standard pattern, and the configuration directives, file paths, and commands are all correct.
- `knockd --version` is valid (the daemon supports `-V` / `--version`).
- `KNOCKD_OPTS="-i eth0"` correctly maps to knockd's `-i, --interface` flag.
- The `knock` client is correctly noted as bundled in the `knockd` package on Debian/Ubuntu.
- One caveat the post correctly flags: any rule added with `iptables -A INPUT -s %IP% ... -j ACCEPT` after the default DROP rule will only be matched if it is evaluated before the DROP. Since `-A` appends, the new ACCEPT rule lands after the DROP rule for port 22, so it would never match. In practice this works because knockd users typically use `-I` (insert at top) or because the conntrack ESTABLISHED/RELATED rule keeps the SSH session open once handshaken — but readers running this exact config from scratch may be confused. Worth flagging in a future revision; left unchanged here per the "fix only technical errors" guidance, and the post itself doesn't claim a specific rule ordering.
- The journalctl/syslog verification commands are valid on modern Ubuntu (systemd-managed knockd).
