# Validation Summary: How to Use Ansible with Cisco IOS Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Cisco IOS / IOS XE
- cisco.ios Ansible collection
- ansible.netcommon network_cli connection
- Cisco IOS configuration, facts, commands, interfaces, VLANs, ACLs, SNMP, backup, and compliance checks

## Sources Consulted
- Ansible Cisco IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible collection installation guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- cisco.ios.ios_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- cisco.ios.ios_command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- cisco.ios.ios_facts module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_facts_module.html
- cisco.ios.ios_interfaces module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html
- cisco.ios.ios_l2_interfaces module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_l2_interfaces_module.html
- cisco.ios.ios_vlans module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_vlans_module.html
- cisco.ios.ios_acls module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_acls_module.html

## Issues Found
- The `ios_acls` example used an unsupported `destination_port` key. Updated the ACL entries to place `port_protocol` under `destination`, which matches the current `cisco.ios.ios_acls` argspec.
- The `save_when: modified` tip said it saves only when changes were actually made. Updated the text to distinguish `modified` from `changed`: `modified` saves when running config differs from startup config, while `changed` saves when the task made a change.
- The prompt-handling tip described `prompt` as a top-level `ios_command` parameter. Updated the wording to explain that prompt handling is done by passing command dictionaries containing `command`, `prompt`, and `answer`.

## Review Notes
- The post uses the current fully qualified collection names and the current `ansible.netcommon.network_cli` connection setting for Cisco IOS.
- The `src` parameter in `ios_config` remains valid for loading a plain configuration file. Current documentation notes that `src` will stop processing Jinja2 templates starting in January 2028; this post's restore example does not depend on template rendering.
