# Validation Summary: How to Use Ansible with Cisco IOS-XR Devices

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible
- Cisco IOS-XR
- cisco.iosxr Ansible collection
- ansible.netcommon Ansible collection
- NETCONF
- BGP
- IS-IS
- MPLS LDP
- VRF / L3VPN

## Sources Consulted
- Ansible cisco.iosxr.iosxr_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/iosxr/iosxr_config_module.html
- Ansible cisco.iosxr.iosxr_command module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/iosxr/iosxr_command_module.html
- Ansible cisco.iosxr.iosxr_interfaces module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/iosxr/iosxr_interfaces_module.html
- Ansible cisco.iosxr.iosxr_l3_interfaces module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/iosxr/iosxr_l3_interfaces_module.html
- Ansible IOS-XR platform options: https://docs.ansible.com/ansible/latest/network/user_guide/platform_iosxr.html
- Ansible ansible.netcommon.netconf_get module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_get_module.html
- Cisco IOS-XR 64-bit migration architecture guide: https://www.cisco.com/c/en/us/td/docs/routers/asr9000/migration/guide/b-migration-to-ios-xr-64-bit/m-difference-32-bit-and-64-bit-os.pdf
- Cisco IOS XR Software data sheet: https://www.cisco.com/c/en/us/products/collateral/ios-nx-os-software/ios-xr-software/datasheet-c78-743014.html
- Cisco IOS-XR IS-IS command reference: https://www.cisco.com/c/en/us/td/docs/routers/xr12000/software/xr12k_r4-1/routing/command/reference/routing_cr41xr12k_chapter3.html
- Cisco IOS-XR BGP / VRF route-target documentation: https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5500/bgp/72x/b-bgp-cg-ncs5500-72x/implementing-bgp.html
- Cisco IOS-XR L3VPN configuration guide: https://www.cisco.com/c/en/us/td/docs/iosxr/ncs5xx/l3vpn/79x/b-l3vpn-cg-79x-ncs540/implementing-mpls-l3vpn.html
- Cisco IOS-XR configuration rollback documentation: https://www.cisco.com/c/en/us/td/docs/routers/xr12000/software/xr12k_r4-3/getting_started/configuration/guide/gs43xxr12k/gs43xinit.html
- Cisco IOS-XR NTP command reference: https://www.cisco.com/en/US/docs/ios_xr_sw/iosxr_r3.7/system_management/command/reference/yr37ntp.html
- Cisco IOS-XR logging command reference: https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/system-monitoring/b-system-monitoring-cr-cisco8k/logging_services_commands.html

## Issues Found
- The architecture description incorrectly combined Linux and microkernel terminology. Updated it to distinguish classic 32-bit QNX-based IOS-XR from modern 64-bit / IOS-XR 7 Linux-based IOS-XR while preserving the process-isolation point.
- The IS-IS NET Jinja expression could produce an invalid system ID for router IDs such as `10.0.0.1`. Replaced it with zero-padded octet formatting that produces a 6-byte system ID grouped in the usual IOS-XR NET format.
- The VRF example placed `rd` after entering the VRF address-family submode. Moved `rd 65000:100` before `address-family ipv4 unicast`, matching common IOS-XR VRF configuration order.
- The NETCONF example used `cisco.iosxr.iosxr_command` while the inventory switched to `ansible.netcommon.netconf`. The IOS-XR command module does not support the NETCONF connection, so the example now uses `ansible.netcommon.netconf_get` with an IOS-XR interface configuration subtree filter.

## Review Notes
The examples are intentionally generic and still require real device-specific values, reachable management addresses, enabled NETCONF service when using NETCONF, and appropriate IOS-XR user task permissions. I could not run the playbooks against an IOS-XR device in this workspace.
