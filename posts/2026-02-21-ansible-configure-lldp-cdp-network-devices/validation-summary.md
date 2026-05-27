# Validation Summary: How to Use Ansible to Configure LLDP/CDP on Network Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Cisco IOS Ansible collection
- LLDP
- CDP
- Cisco IOS and IOS XE discovery protocol commands
- Ansible CLI parsing with ntc_templates

## Sources Consulted
- Ansible cisco.ios.ios_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible cisco.ios.ios_lldp_global module documentation: https://docs.ansible.com/ansible/latest/collections/cisco/ios/ios_lldp_global_module.html
- Ansible cisco.ios.ios_lldp_interfaces module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_lldp_interfaces_module.html
- Ansible ansible.utils.cli_parse module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/cli_parse_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Cisco Discovery Protocol Configuration Guide, Cisco IOS Release 15M&T: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/cdp/configuration/15-0m/nm-cdp-discover.html
- Cisco IOS XE LLDP configuration guide for Catalyst switches: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9400/software/release/16-11/configuration_guide/int_hw/b_1611_int_and_hw_9400_cg.pdf

## Issues Found
- The LLDP playbook only configured LLDP when `discovery_config.lldp.enabled` was true and did nothing when it was false. Added a `cisco.ios.ios_lldp_global` task with `enabled: false`, which maps to disabling LLDP globally.
- The topology data copy task wrote to `topology/{{ inventory_hostname }}.json`, but Ansible's copy module does not create a missing parent directory for file destinations. Added a delegated `ansible.builtin.file` task to create the `topology` directory first.
- The verification playbook used `show cdp neighbors | count` and `show lldp neighbors | count`, which is less portable and reports CLI output line counts rather than parsed neighbor objects. Changed the tasks to collect detailed neighbor output, parse it with `ansible.utils.cli_parse` and ntc_templates, and report parsed list lengths.
- The LLDP leak check matched any output containing `Tx`, which could flag disabled interfaces because `show lldp interface` output includes transmit fields even when disabled. Changed the condition to look for enabled transmit or receive states.

## Review Notes
- The examples use current `cisco.ios` LLDP resource modules rather than the deprecated older `ios_lldp` module.
- The LLDP `tlv_select` options are valid, but Ansible documentation notes that TLV selection may not be idempotent on Cisco IOS because devices do not record configured TLV-select options in a way Ansible can verify.
