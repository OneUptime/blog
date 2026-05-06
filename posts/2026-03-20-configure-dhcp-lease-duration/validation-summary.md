# Validation Summary: How to Configure DHCP Lease Duration

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCP
- ISC DHCP (`dhcpd`)
- `dnsmasq`
- NetworkManager / `nmcli`
- Linux DHCP client lease files
- Python

## Sources Consulted
- RFC 2131, Dynamic Host Configuration Protocol: https://www.rfc-editor.org/rfc/rfc2131
- ISC DHCP 4.4 `dhcpd.conf` manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP `dhclient.leases` manual: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhclientleases
- Ubuntu `dhclient.leases(5)` manpage: https://manpages.ubuntu.com/manpages/noble/man5/dhclient.leases.5.html
- `dnsmasq` man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- NetworkManager `nmcli` reference manual: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- ISC DHCP End of Life Dates: https://kb.isc.org/docs/isc-dhcp-eol-dates

## Issues Found
- The post described T1 and T2 as fixed fractions of every DHCP lease. RFC 2131 defines 50% and 87.5% as the default renewal and rebinding timers when the server does not provide different values. I updated the explanation, section heading, code docstring, and key takeaways to make that behavior explicit.
- The Linux lease-file example was presented as a generic client-side path, but `/var/lib/dhcp/dhclient.leases` is specifically the `dhclient` lease database path. I updated the command comment to scope it to ISC `dhclient`.
- The NetworkManager example hard-coded `eth0`, which is not a reliable interface name on modern Linux systems. I changed it to `<interface>` so the command remains correct across naming schemes.

## Review Notes
- The recommended lease durations by network type are operational guidance, not protocol-mandated values.
- ISC DHCP (`dhcpd`) is end-of-life according to ISC, but the configuration syntax used in the post is still technically correct for existing deployments.
