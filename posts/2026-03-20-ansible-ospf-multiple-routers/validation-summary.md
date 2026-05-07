# Validation Summary: How to Configure OSPF on Multiple Routers with an Ansible Playbook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Cisco IOS
- OSPFv2
- `cisco.ios.ios_ospfv2`
- `cisco.ios.ios_l3_interfaces`
- `cisco.ios.ios_command`
- `cisco.ios.ios_config`

## Sources Consulted
- Ansible `cisco.ios.ios_ospfv2` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_ospfv2_module.html
- Ansible `cisco.ios.ios_l3_interfaces` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_l3_interfaces_module.html
- Ansible `cisco.ios.ios_command` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible `cisco.ios.ios_config` module docs: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible `ansible-playbook` CLI docs: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible check mode docs: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Cisco IOS XE `show ip ospf neighbor` command reference: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9500/software/release/16-9/command_reference/b_169_9500_cr/ip_unicast_routing_commands.pdf
- Cisco IOS show command output redirection reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-16-7/fundamentals-xe-16-7-book/cf-shw-cmd-out-redirect.pdf
- Cisco OSPF command reference for `area ... stub` and OSPF authentication: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/m_ospf-a1.html
- Cisco OSPF command reference for `ip ospf message-digest-key`: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_ospf/command/iro-cr-book/ospf-i1.html
- RFC 2328, OSPF Version 2: https://datatracker.ietf.org/doc/rfc2328/

## Issues Found
- The `ios_ospfv2` example used `passive_interfaces.interfaces`, but the current module argspec expects `passive_interfaces.interface` with a `name` list. I corrected the snippet to use the documented structure and set `Loopback0` explicitly.
- The verification playbook used `show ip ospf neighbor | count FULL` and then cast the returned string directly to an integer. Cisco IOS documents `| count` as output redirection that returns descriptive text instead of a raw numeric value, so the assertion logic was not reliable. I changed the check to count `FULL/` matches in `show ip ospf neighbor` output directly.
- The authentication example used `cisco.ios.ios_command` to enter configuration mode and push interface configuration. The official Ansible docs state that `ios_command` does not support configuration mode. I replaced it with `cisco.ios.ios_config`, which is the correct module for interface configuration.
- The stub-area example enabled area 1 as a stub only on `router03`. Cisco documents that the stub-area command must be configured on all routers in the stub area, including the ABR. I corrected the example so the variable is set on both `router02` and `router03`.

## Review Notes
- The post is now technically consistent with the current Ansible collection docs and Cisco IOS command references.
- The loopback address is configured to match the explicit OSPF router ID, but the loopback prefix is not included in `ospf_networks`, so it is not advertised by OSPF in this example. That is acceptable here because the router ID is configured directly.
- The save step uses `write memory`, which is valid on Cisco IOS. A future revision could use `cisco.ios.ios_config` with `save_when` if the post later wants a more explicitly idempotent save example.
