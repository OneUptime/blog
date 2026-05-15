# Validation Summary: How to Set Up Dynamic DNS with BIND and DHCP on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9 / `named`
- ISC DHCP / `dhcpd`
- Dynamic DNS updates
- TSIG keys
- `dig`, `nsupdate`, `rndc`, `firewall-cmd`, and systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing networking infrastructure services - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_networking_infrastructure_services/index
- ISC DHCP 4.4 Manual Pages: dhcpd.conf - https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- BIND 9 Administrator Reference Manual: Dynamic Update and Journal Files - https://bind9.readthedocs.io/en/stable/chapter6.html#dynamic-update
- BIND 9 Manual Pages: tsig-keygen, nsupdate, rndc, and named.conf - https://bind9.readthedocs.io/en/v9.18.2/manpages.html
- RFC 2136: Dynamic Updates in the Domain Name System - https://www.rfc-editor.org/rfc/rfc2136

## Issues Found
- Corrected the sequence diagram from `nsupdate` to DNS UPDATE messages. ISC DHCP sends DNS dynamic update protocol messages to BIND; `nsupdate` is the manual CLI tool used later in the post.
- Corrected the DHCP configuration comment that said `option domain-name` tells clients to send their hostname. That option supplies the DNS domain to clients; hostnames must be supplied by the client or configured separately.
- Added a `named-checkzone` command for the reverse zone, because the guide creates and serves both forward and reverse zones.
- Narrowed the closing statement so it says devices that provide a hostname get DNS records, rather than implying every DHCP client automatically gets a usable DNS name.

## Review Notes
The guide uses ISC DHCP, which is correct for the `dhcp-server` package and `dhcpd` service on RHEL 9, but ISC DHCP is end-of-life upstream. Administrators planning new long-term deployments may want to evaluate their distribution support lifecycle and alternatives such as Kea DHCP.
