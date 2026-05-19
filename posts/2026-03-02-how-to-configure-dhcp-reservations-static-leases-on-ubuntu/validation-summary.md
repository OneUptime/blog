# Validation Summary: How to Configure DHCP Reservations (Static Leases) on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- DHCP
- ISC DHCP Server (`dhcpd`)
- ISC Kea DHCPv4
- Kea Control Agent API
- Kea MySQL hosts database
- Linux networking commands

## Sources Consulted
- Ubuntu Server documentation: Install and configure ISC DHCP Server - https://documentation.ubuntu.com/server/how-to/networking/install-isc-dhcp-server/
- Ubuntu `dhcpd(8)` manpage - https://manpages.ubuntu.com/manpages/xenial/en/man8/dhcpd.8.html
- Debian `dhcpd.conf(5)` manpage for ISC DHCP Server - https://manpages.debian.org/bookworm/isc-dhcp-server/dhcpd.conf.5.en.html
- ISC Knowledge Base: How to reload the dhcpd configuration file - https://kb.isc.org/docs/aa-00335
- Kea ARM: DHCPv4 Server host reservations and hosts database configuration - https://kea.readthedocs.io/en/kea-2.7.7/arm/dhcp4-srv.html
- Kea ARM: Host Commands hook library (`reservation-add`, `reservation-get`) - https://kea.readthedocs.io/en/kea-2.5.4/arm/hooks.html
- Kea API Reference: `lease4-get-all` availability via lease commands hook - https://kea.readthedocs.io/en/kea-2.5.4/api.html
- ISC Knowledge Base: Ports used by Kea - https://kb.isc.org/docs/kea-ports

## Issues Found
- The post said `systemctl reload isc-dhcp-server` is enough when adding ISC DHCP reservations. ISC documents that `dhcpd` has no reload mechanism, and Ubuntu's server guide tells users to restart after configuration changes. I removed the reload command and left the restart command.
- The Kea API examples implied reservations can be added at runtime via the REST API without prerequisites. Kea's `reservation-add` and `reservation-get` commands require the Control Agent path plus the host commands hook and a writable hosts database. I updated the heading and introduction to state those requirements.
- The Kea `lease4-get-all` testing command requires the lease commands hook. I added a comment before the command so readers know why it may not be available in a default Kea setup.
- The bulk reservation script uses `reservation-add`, so it has the same Kea Control Agent, host commands hook, and writable hosts database requirements. I updated the lead-in sentence accordingly.

## Review Notes
- Ubuntu still packages `isc-dhcp-server`, but Ubuntu notes that ISC DHCP is no longer supported by its vendor. The post already frames ISC DHCP as the older server and also covers Kea, so no content change was required.
- Kea database reservations are technically valid, but direct SQL inserts bypass the validation provided by Kea's host commands hook. For operational use, the API is safer when the required hook and database backend are available.
