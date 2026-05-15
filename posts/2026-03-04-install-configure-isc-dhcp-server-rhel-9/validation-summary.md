# Validation Summary: How to Install and Configure an ISC DHCP Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- ISC DHCP server (`dhcpd`)
- DHCPv4 configuration
- systemd service configuration
- firewalld
- NetworkManager and `nmcli`
- rsyslog

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Providing DHCP services: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/providing-dhcp-services_networking-infrastructure-services
- Red Hat Enterprise Linux 9.5 release notes: Deprecated functionalities: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.5_release_notes/deprecated-functionalities
- Red Hat Enterprise Linux 9 documentation: Configuring NetworkManager DHCP settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-networkmanager-dhcp-settings_configuring-and-managing-networking
- ISC DHCP 4.4 manual page: `dhcpd.conf`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP manual page: `dhcp-options`: https://kb.isc.org/docs/isc-dhcp-41-manual-pages-dhcp-options
- firewalld documentation: Services: https://firewalld.org/documentation/service/

## Issues Found
- The introduction described ISC DHCP as the standard Linux implementation without noting its RHEL 9 deprecation status. Updated the wording to describe it as widely used and added a RHEL 9-specific deprecation and migration caveat based on Red Hat release notes.
- The interface section stated that `dhcpd` tries to listen on all interfaces by default. Red Hat documents that `dhcpd` processes requests only on interfaces whose IP address belongs to a subnet declared in the service configuration. Updated the wording to reflect that behavior.
- The DHCP options section presented `option vendor-class-identifier "PXEClient";` as a custom vendor-specific option. ISC documents `vendor-class-identifier` as client-supplied data normally used by the server to decide which options to return. Replaced it with a class match example for PXE clients.
- The conclusion described ISC DHCP as reliable without mentioning the RHEL 9 deprecation. Added a brief reminder to plan migration before later major RHEL releases.

## Review Notes
The post remains technically useful for RHEL 9 systems where `dhcp-server` is still available, but it should not be presented as a preferred long-term choice for new deployments without the deprecation caveat. The client-side `dhclient` testing commands can still work if `dhcp-client` is installed, but NetworkManager's internal DHCP client is the default on RHEL 9 and `dhclient` is deprecated.
