# Validation Summary: How to Troubleshoot 'Request Timed Out' Ping Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ICMP (Internet Control Message Protocol)
- Windows `ping`, `tracert`, `route`, `arp`, `netsh advfirewall`
- PowerShell `New-NetFirewallRule`
- Linux `ping`, `traceroute`, `mtr`, `ip route`, `ip neigh`
- iptables, firewalld, nftables
- nmap, curl, tcpdump

## Sources Consulted
- Microsoft `netsh advfirewall firewall` reference (https://learn.microsoft.com/en-us/windows-server/networking/technologies/netsh/netsh-advfirewall-firewall)
- Microsoft `New-NetFirewallRule` docs (https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule)
- iputils `ping(8)` and `traceroute(8)` man pages
- iptables man page for `--icmp-type` values
- firewalld documentation for ICMP blocks (https://firewalld.org/documentation/man-pages/firewall-cmd.html)
- nmap reference guide for `-sS` SYN scan (https://nmap.org/book/man-port-scanning-techniques.html)
- tcpdump man page for filter expressions
- RFC 792 (ICMP, echo request type 8 / echo reply type 0)

## Issues Found
- **firewalld "ping" service (Step 5):** The post used `sudo firewall-cmd --add-service=ping --permanent`, but firewalld has no predefined `ping` service. firewalld controls ICMP via `icmp-blocks` (echo-request is allowed by default in standard zones; it only fails when an explicit block is present). Replaced the snippet with `firewall-cmd --list-icmp-blocks` and `firewall-cmd --permanent --remove-icmp-block=echo-request` followed by `--reload`, which is the supported method.

## Review Notes
- `netsh advfirewall firewall add rule ... protocol=icmpv4:8,any dir=in action=allow` uses the correct `icmpv4:type,code` notation for type 8 (echo request).
- `New-NetFirewallRule -Protocol ICMPv4 -IcmpType 8` is valid PowerShell syntax.
- `traceroute -I` (ICMP ECHO) and `-T` (TCP SYN) flags match the iputils/Debian traceroute implementations used on most Linux distros; note that `-T` typically requires root.
- `nmap -sS` (SYN scan) requires root privileges on Linux/macOS; this is not called out explicitly but is standard.
- `ping -I eth0` on Linux accepts either an interface name or a source address, matching the post's usage.
- The Windows/Linux command separation is clean and the troubleshooting flow is logical.
