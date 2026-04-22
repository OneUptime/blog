# Validation Summary: How to Set Up DHCP on pfSense

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- pfSense DHCPv4 service
- Kea DHCP backend
- ISC DHCP/dhcpd backend
- DHCP static mappings
- DHCP custom options
- pfSense WebGUI and CLI troubleshooting

## Sources Consulted
- Netgate pfSense DHCP overview: https://docs.netgate.com/pfsense/en/latest/services/dhcp/index.html
- Netgate pfSense DHCPv4 Server documentation: https://docs.netgate.com/pfsense/en/latest/services/dhcp/ipv4.html
- Netgate pfSense Kea Settings documentation: https://docs.netgate.com/pfsense/en/latest/services/dhcp/kea-settings.html
- Netgate pfSense DHCPv4 Status documentation: https://docs.netgate.com/pfsense/en/latest/monitoring/status/dhcp-ipv4.html
- Netgate pfSense DHCP Logs documentation: https://docs.netgate.com/pfsense/en/latest/monitoring/logs/dhcp.html
- Netgate pfSense Working with Log Files documentation: https://docs.netgate.com/pfsense/en/latest/monitoring/logs/manage.html
- Netgate pfSense source for generated DHCP config and lease paths: https://github.com/pfsense/pfsense/blob/master/src/etc/inc/services.inc
- Netgate pfSense source for DHCP path globals: https://github.com/pfsense/pfsense/blob/master/src/etc/inc/globals.inc
- ISC DHCP 4.4 dhcpd manual page: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpd
- IANA BOOTP/DHCP option registry: https://www.iana.org/assignments/bootp-dhcp-parameters/bootp-dhcp-parameters.xhtml

## Issues Found
- The description said pfSense DHCP is based on ISC dhcpd. Current pfSense supports Kea and ISC backends, with ISC deprecated, so the description now refers to the built-in DHCP service instead of tying the article to ISC.
- The post used "reservations" for pfSense static mappings. Netgate documents static mappings as preferences/static mappings, not true reservations in the ISC sense, so the wording now uses "static mappings."
- The DNS server guidance said leaving DNS blank uses only the DNS Resolver. Netgate documents automatic behavior that may use the DNS Resolver, DNS Forwarder, or system DNS settings depending on configuration, so the wording now reflects that.
- The generated `dhcpd.conf`, lease file, custom DHCP options, and `dhcpd -t` examples were not marked as ISC-only. They are now labeled as legacy ISC backend examples, and the `dhcpd -t` command includes the pfSense chroot/config path.
- The CLI static mapping block implied a Web API and used an empty PHP placeholder. It now points users to the GUI first and mentions `pfSsh.php` for advanced config.xml work.
- The Additional BOOTP/DHCP Options example used the wrong UI type label and did not mention Kea. It now uses `IP address or host`, labels the section as ISC-only, and points Kea users to Custom Configuration JSON.
- The leases section said all active and expired leases are shown by default. Netgate documents that inactive/expired leases require "Show all configured leases," so this was corrected.
- The log path guidance used `System > System Logs > DHCP` and `clog`. Current pfSense uses `Status > System Logs`, DHCP tab, and modern pfSense releases use plain text logs, so the CLI example now uses `tail -50 /var/log/dhcpd.log`.

## Review Notes
The post is now technically accurate as a concise DHCP setup guide. A future expansion could add a complete Kea JSON custom option example, but that was outside the requested narrow correction scope.
