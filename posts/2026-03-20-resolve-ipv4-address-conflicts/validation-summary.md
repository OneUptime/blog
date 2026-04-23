# Validation Summary: How to Resolve IPv4 Address Conflicts on a Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- ARP
- DHCP
- ISC DHCPD
- Windows Event Viewer
- Windows `ipconfig`
- Linux `arping`
- Linux `arp`
- Nmap
- Cron

## Sources Consulted
- RFC 5227, "IPv4 Address Conflict Detection": https://www.rfc-editor.org/rfc/rfc5227
- Microsoft Learn, `ipconfig`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn, Event ID 4199 and Windows client can't get an IP address from the DHCP server: https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/event-4199-windows-client-cannot-get-ip-address-dhcp-server
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC Knowledge Base, "Why is ISC skeptical of the value of Ping-Check?": https://kb.isc.org/docs/ping-check
- ISC Knowledge Base, "Reducing DHCP memory consumption": https://kb.isc.org/docs/aa-01464
- ISC DHCP 4.1 `dhclient` manual: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhclient
- Nmap Reference Guide, Options Summary: https://nmap.org/book/man-briefoptions.html
- Debian manpage for `arping` (iputils): https://manpages.debian.org/testing/iputils-arping/arping.8.en.html
- net-tools `arp(8)` manual: https://net-tools.sourceforge.io/man/arp.8.html
- MACVendors lookup page (URL validation): https://macvendors.com/

## Issues Found
- The Windows Event Viewer navigation line was written as if it were a `cmd` command. I changed it to an executable `eventvwr.msc` command plus a comment describing the manual navigation path.
- The Linux `arping` example used a weaker form for duplicate detection. I changed it to `arping -b -c 5 -I eth0 192.168.1.50` so the probe stays at broadcast and can observe multiple responders more reliably.
- The original Step 2 claim that `arp -n | grep ...` would get both conflicting MAC addresses was inaccurate because the local ARP cache typically shows only the current mapping. I added an active `arping ... | awk ... | sort -u` command to capture unique responding MAC addresses and kept `arp -n` as a cache check.
- The OUI lookup note overstated what the lookup can identify. I corrected it to say it helps identify the vendor, not the exact device.
- The Nmap example used `nmap -sn ... --open`. Per Nmap's reference guide, `-sn` disables port scanning, so `--open` is not appropriate there. I changed it to `nmap -sn 192.168.1.0/24`.
- The DHCP reservation guidance was too broad for IPv4. ISC documents that DHCPv4 dynamic pools are created without awareness of fixed-address assignments elsewhere in the config, so overlapping manually configured static IPv4 addresses with the dynamic pool is unsafe. I corrected the text to reserve DHCP addresses only for devices that actually use DHCP and to keep manually configured static IPv4 addresses outside the pool.
- The `ping-check` explanation implied guaranteed prevention. ISC's documentation describes it as an ICMP-based best-effort check, so I changed the text to say the lease is abandoned when ICMP replies are seen and noted that devices blocking ICMP may still be missed.
- The monitoring script did not actually detect duplicate IP conflicts reliably. It scanned the local ARP cache for duplicate IP strings, which is not how duplicate-IP conflicts normally appear. I replaced it with an active `arping`-based check over known static or reserved IPs and made the root privileges explicit with `sudo` and a root crontab entry.

## Review Notes
- The post now validates technically, but the DHCP examples are for ISC DHCPD, which ISC marks as end-of-life. The syntax is still correct for legacy ISC DHCP deployments, but future revisions could add equivalent Kea DHCP guidance.
- `arp` remains valid on systems that ship net-tools, but many modern Linux distributions prefer `ip neigh` from iproute2.
