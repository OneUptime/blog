# Validation Summary: How to Use Ansible to Configure BGP on Network Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Cisco IOS Ansible collection
- Cisco IOS BGP configuration
- eBGP and iBGP
- Prefix lists, route maps, BGP communities, and aggregate routes

## Sources Consulted
- Ansible `cisco.ios.ios_bgp_global` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_bgp_global_module.html
- Ansible `cisco.ios.ios_bgp_address_family` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_bgp_address_family_module.html
- Ansible `cisco.ios.ios_static_routes` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_static_routes_module.html
- Ansible `cisco.ios.ios_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Cisco IOS BGP `aggregate-address` command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-a1.html
- Cisco IOS `show ip bgp` command reference: https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp5.html
- Cisco IOS XE BGP soft configuration guide: https://www.cisco.com/c/en/us/td/docs/routers/ios/config/17-x/ip-routing/b-ip-routing/m_irg-soft-config.html

## Issues Found
- The `ios_bgp_global` example used `bgp.bestpath`, but the current Cisco IOS Ansible resource-module schema uses `bgp.bestpath_options`. Updated the example accordingly.
- The eBGP neighbor password used `password`, which is not the current resource-module option. Updated it to `password_options` with `encryption` and `pass_key`.
- The eBGP neighbor timer block was placed under the global neighbor resource schema where it is not supported. Removed that invalid block.
- The `ios_bgp_address_family` example used `prefix_list`; the current option is `prefix_lists`. Updated the key.
- The iBGP address-family neighbor used `next_hop_self`; the current option is `nexthop_self`. Updated the key.
- The community propagation command was shown under global BGP configuration. Moved it under the IPv4 unicast address family, where it applies to the activated address-family neighbor.
- The local-preference route map was created but not applied to the ISP neighbor. Added a task to apply `SET_LOCAL_PREF` inbound under the IPv4 unicast address family.
- The aggregate-route section said it used `suppress-map`, but the code used `summary-only`. Updated the text to match the configuration.
- The null-route comment said null routes were required for BGP aggregate advertisement. Clarified that they provide matching RIB entries for the `network` statements.
- The verification playbook used CIDR notation in `show ip bgp` commands; Cisco IOS command syntax documents the address and mask form. Updated the commands to use dotted masks.
- The aggregate verification debug task looped over `aggregate_check.results`, but a single `ios_command` task with multiple commands returns `stdout` and `stdout_lines`, not per-loop `results`. Updated it to loop over `aggregate_check.stdout_lines`.

## Review Notes
The examples remain illustrative and should still be tested in a lab before production use. The inbound prefix-list example intentionally permits all prefixes up to /24 after the default route entry; in real ISP peering, operators would usually replace that broad example with provider- and business-specific policy.
