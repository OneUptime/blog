# Validation Summary: How to Use Ansible to Configure VLANs on Network Switches

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and YAML inventory
- Ansible network resource modules
- Cisco IOS VLAN and Layer 2 interface configuration
- Arista EOS VLAN configuration
- Cisco NX-OS VLAN configuration
- VLAN access, voice, trunk, native VLAN, and allowed VLAN configuration

## Sources Consulted
- Ansible cisco.ios.ios_vlans module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_vlans_module.html
- Ansible cisco.ios.ios_l2_interfaces module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_l2_interfaces_module.html
- Ansible cisco.ios.ios_interfaces module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html
- Ansible IOS Platform Options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible arista.eos.eos_vlans module documentation: https://docs.ansible.com/ansible/latest/collections/arista/eos/eos_vlans_module.html
- Ansible cisco.nxos.nxos_vlans module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_vlans_module.html

## Issues Found
- The Cisco IOS trunk examples used `trunk.allowed_vlans` as a scalar comma-separated string. Current `cisco.ios.ios_l2_interfaces` documentation defines `allowed_vlans` as a list of strings, so the examples were changed to use a YAML list containing the VLAN range string.
- The reusable `trunk_ports` host variable used the same scalar `allowed_vlans` value. It was changed to the same list form so the looped `ios_l2_interfaces` task passes the documented argument type.
- The `overridden` example omitted VLAN 50 even though the earlier standard VLAN set and trunk examples included VLAN 50 for printers. VLAN 50 was added to the `authorized_vlans` list so the example does not accidentally remove a VLAN from the post's stated standard.

## Review Notes
The examples use current fully qualified collection names and current `ansible_network_os` values. The `overridden` state remains inherently disruptive because it removes VLANs not present in the supplied configuration; the post already includes a warning before that task.
