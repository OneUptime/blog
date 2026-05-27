# Validation Summary: How to Use Ansible to Configure Routing on Network Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Cisco IOS Ansible collection
- Cisco IOS static routes
- OSPF
- BGP
- Route maps and prefix lists
- Network automation with `network_cli`

## Sources Consulted
- Ansible `cisco.ios.ios_static_routes` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_static_routes_module.html
- Ansible `cisco.ios.ios_ospfv2` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_ospfv2_module.html
- Ansible `cisco.ios.ios_bgp_global` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_bgp_global_module.html
- Ansible `cisco.ios.ios_bgp_address_family` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_bgp_address_family_module.html
- Ansible `cisco.ios.ios_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible IOS platform options documentation: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Cisco IOS `ip route` command reference: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/ip_route.htm

## Issues Found
- The `ios_static_routes` example used `admin_distance`, which is not the current `cisco.ios.ios_static_routes` option name. Changed it to `distance_metric`.
- The variable-driven `ios_config` static route example used CIDR notation in a raw Cisco IOS `ip route` command. Cisco IOS CLI syntax expects a destination prefix and subnet mask. Changed the variables to `prefix` and `mask`, and updated the command template accordingly.
- The OSPF resource-module example included a `redistribute` block that is not part of the `ios_ospfv2` module schema. Moved the redistribution commands into a separate `ios_config` task under `router ospf 1`.
- The BGP global example set `router_id` as a scalar string, but `ios_bgp_global` expects a dictionary. Changed it to `router_id.address`.
- The BGP neighbor timer example used `keepalive`, but the neighbor timer field is `interval`. Changed `keepalive: 30` to `interval: 30`.
- The BGP address-family example used the deprecated singular `route_map` option. Changed it to `route_maps` and combined the inbound and outbound route maps under one neighbor entry.

## Review Notes
- The examples still assume Cisco IOS/IOS XE devices and an inventory with the expected connection variables, privileges, and host variables such as `router_id`.
- `connection: network_cli` remains technically valid in Ansible playbooks, though current documentation often shows the fully qualified `ansible.netcommon.network_cli` inventory value.
