# Validation Summary: How to Configure IPv6 DHCP in Virtualization Platforms

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DHCPv6
- ISC Kea DHCPv6
- libvirt
- dnsmasq
- KVM
- OpenStack Neutron
- VMware NSX-T
- Proxmox LXC
- Python `requests`

## Sources Consulted
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- Kea DHCPv6 server documentation: https://kea.readthedocs.io/en/kea-3.0.0/arm/dhcp6-srv.html
- Kea hook libraries documentation (`libdhcp_lease_cmds.so`): https://kea.readthedocs.io/en/stable/arm/hooks.html
- Kea shell / direct HTTP control socket notes: https://kea.readthedocs.io/en/latest/arm/shell.html
- libvirt network XML format: https://www.libvirt.org/formatnetwork.html
- libvirt-devel discussion on IPv4/IPv6 `ip-dhcp-host` family matching and parent index behavior: https://lists.libvirt.org/archives/list/devel%40lists.libvirt.org/thread/7AABX35A2V2J3MANHCMKO3FYKRIAP5MW/
- OpenStack subnet CLI documentation: https://docs.openstack.org/python-openstackclient/zed/cli/command-objects/subnet.html
- OpenStack IPv6 networking guide: https://docs.openstack.org/ocata/networking-guide/config-ipv6.html
- VMware NSX-T `SegmentDhcpConfig` API schema: https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/types_SegmentDhcpConfig.html
- VMware NSX-T DHCP Policy APIs: https://developer.broadcom.com/xapis/nsx-t-data-center-rest-api/latest/policy_networking_ip_management_dhcp.html
- Proxmox `pct(1)` documentation: https://pve.proxmox.com/pve-docs/pct.1.html

## Issues Found
- Several example IPv6 prefixes and addresses were syntactically invalid, including `2001:db8:vms::/64`, `fd00:vm:net::10`, `2001:db8:cloud::/64`, and `fd00:nsx:dhcp::1`. I replaced them with valid documentation prefixes and ULAs.
- The Kea management API example would not work as written because the DHCPv6 server exposes no control socket by default, the example used the wrong HTTP port, and `lease6-get-all` requires the `libdhcp_lease_cmds.so` hook library. I added the required `control-sockets` and `hooks-libraries` configuration and corrected the endpoint to `127.0.0.1:8000`.
- The Kea API examples used a Control Agent-style `service` wrapper even though the post now configures a direct DHCPv6 HTTP control socket. I removed that wrapper from both the `curl` example and the Python script.
- The Python monitoring script expected an `expire` field that `lease6-get-all` does not return. I changed it to compute expiry from `cltt + valid-lft`, added HTTP error handling, and aligned it with the corrected Kea API endpoint.
- The libvirt DHCPv6 examples used an invalid IPv6 example address and a MAC-only reservation pattern that is not the preferred IPv6 method in libvirt. I replaced them with DUID-based `id=` examples and targeted the IPv6 `<ip>` section for dual-stack networks.
- The OpenStack section implied all Neutron deployments use dnsmasq for DHCPv6 and that the shown command exposes DHCP leases directly. I narrowed the wording to the reference DHCP agent and clarified that the command lists assigned IPv6 addresses on ports.
- The NSX-T section used an invalid IPv6 literal and version-specific UI wording that was not stable enough to trust. I rewrote it to use generic DHCP server config / segment-subnet DHCP configuration terms from the official NSX API model.
- The Proxmox section described DHCPv6 as coming "from the host" and used invalid IPv6 examples. I corrected the wording to the attached bridge network and fixed the sample prefix.

## Review Notes
- Kea direct HTTP/HTTPS control sockets are available in modern Kea releases (2.7.2 and later); older versions use UNIX control sockets or the separate Control Agent.
- Kea `systemctl` unit names can vary by distribution even though upstream documentation commonly shows `kea-dhcp6`.
- For large Kea lease databases, `lease6-get-page` is a safer operational choice than `lease6-get-all` because `lease6-get-all` can return very large responses.
