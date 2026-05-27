# Validation Summary: How to Use Ansible to Set Up a DHCP Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ISC DHCP Server
- DHCP failover
- Debian/Ubuntu package management with apt
- systemd
- UFW
- Linux DHCP client testing

## Sources Consulted
- ISC DHCP official product status and EOL notice: https://www.isc.org/dhcp/
- ISC DHCP EOL dates: https://kb.isc.org/docs/isc-dhcp-eol-dates
- ISC DHCP 4.4 dhcpd.conf manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP failover guide: https://kb.isc.org/docs/aa-00502
- Debian dhcpd(8) manual for isc-dhcp-server: https://manpages.debian.org/bookworm/isc-dhcp-server/dhcpd.8.en.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible template module documentation: https://docs.ansible.com/ansible/8/collections/ansible/builtin/template_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- dhclient manual: https://man.he.net/man8/dhclient

## Issues Found
- The post described ISC DHCP as the standard Linux implementation without mentioning its maintenance status. ISC DHCP is end-of-life and ISC recommends Kea for most new server deployments, so the introduction and description were updated to describe ISC DHCP as a legacy implementation still used in existing environments.
- The failover template defined the dynamic range directly in the subnet and again inside a failover pool. ISC DHCP failover should reference the failover peer from the pool being shared, so the top-level range is now emitted only when failover is disabled.
- The firewall task opened UDP port 67 for DHCP service but did not open TCP port 647 for ISC DHCP failover peer communication. A conditional UFW task was added for TCP 647 when failover is enabled.
- The role used UFW without ensuring the target had the ufw package installed. The install task now installs both isc-dhcp-server and ufw.
- The UFW task used the short module name even though UFW is provided by the community.general collection rather than ansible-core. The examples now use community.general.ufw and the running instructions include installing the community.general collection.
- The summary overstated failover as guaranteeing service availability if a server goes down. It was revised to say failover lets a pair of servers share address pools for high availability when both peers are configured consistently.

## Review Notes
The Ansible apt, template validate, and systemd examples match current module behavior. The dhcpd validation command syntax, INTERFACESv4 setting, DHCP options, host reservation syntax, and dhclient test command are consistent with the referenced manuals. Local syntax execution was not performed because dhcpd, ansible-playbook, and dhclient are not installed in this workspace.
