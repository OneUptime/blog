# Validation Summary: How to Troubleshoot Slow WiFi Caused by IP Address Conflicts

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ARP (Address Resolution Protocol) and gratuitous ARP
- arping (iputils)
- arp-scan
- nmap (host discovery)
- dhclient (ISC DHCP client)
- Windows ipconfig and Event Viewer (Event ID 4199)
- macOS ipconfig
- dnsmasq DHCP server (dhcp-host reservations)
- ISC DHCPD (dhcpd.conf, ping-check/ping-timeout)
- tcpdump (ARP capture)

## Sources Consulted
- iputils arping man page (https://man7.org/linux/man-pages/man8/arping.8.html)
- arp-scan documentation (https://github.com/royhills/arp-scan)
- ISC DHCP server reference — dhcpd.conf(5) ping-check / ping-timeout statements (https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf)
- dnsmasq man page — dhcp-host syntax (https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html)
- macOS ipconfig(8) man page — `set <interface> DHCP` form
- Microsoft docs — Tcpip event 4199 (IP address conflict detected) in System log
- nmap reference — `-sn` host discovery (https://nmap.org/book/man-host-discovery.html)
- RFC 5227 — IPv4 Address Conflict Detection (gratuitous ARP semantics)

## Issues Found
No technical issues found. All commands, flags, configuration directives, and protocol explanations are accurate:
- `arping -c 5 <ip> -I <iface>` is valid for iputils-arping (the default on most Linux distros).
- `arp-scan --interface=<iface> --localnet` is valid syntax.
- `ipconfig set en0 DHCP` is the correct macOS command to trigger DHCP renewal on en0.
- dnsmasq's `dhcp-host=<MAC>,<IP>,<hostname>` format is correct.
- ISC DHCPD's `ping-check` and `ping-timeout` are valid statements; default `ping-timeout` is 1 second so `2;` is a reasonable override.
- Windows System log Event ID 4199 (source: Tcpip) does correspond to IP address conflict detection.
- Gratuitous ARP is correctly described as having the sender protocol address equal to the target protocol address (per RFC 5227 §1.1).

## Review Notes
- `nmap -sn 192.168.1.0/24 --open`: the `--open` flag is intended for port-scan output filtering and has no effect when combined with `-sn` (no-port host discovery). It is harmless — nmap accepts and ignores it — but the flag is superfluous in this context.
- The duplicate-detection one-liner `arp -a | awk '{print $2}' | sort | uniq -d` is a best-effort heuristic. The kernel ARP cache normally stores only one MAC per IP (the most recent), so this will rarely catch a steady-state conflict; it can catch transitional flapping. The post's primary detection method (`arping` looking for multiple distinct MAC replies) is the reliable approach.
- `dhclient` is being phased out in favour of `dhcpcd` / NetworkManager / systemd-networkd on many modern distributions. The command shown still works on systems where `isc-dhcp-client` is installed, but readers on newer Ubuntu/Fedora releases may need the equivalent NetworkManager command (`nmcli device reapply <iface>` or `nmcli connection up <name>`).
- The term "ARP storm" is used loosely; in practice an IP conflict typically produces elevated ARP traffic and ARP-cache flapping rather than a true broadcast storm.
