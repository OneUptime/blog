# Validation Summary: How to Use Ansible cli_command Module for Network Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.netcommon.cli_command
- ansible.netcommon.network_cli
- ansible.utils.cli_parse
- TextFSM
- Network device CLI automation
- Cisco IOS, Cisco NX-OS, Cisco IOS-XR, Arista EOS, Juniper Junos, and VyOS

## Sources Consulted
- Ansible Community Documentation: ansible.netcommon.cli_command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_command_module.html
- Ansible Community Documentation: Working with command output and prompts in network modules - https://docs.ansible.com/projects/ansible/latest/network/user_guide/network_working_with_command_output.html
- Ansible Community Documentation: ansible.utils.cli_parse module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/cli_parse_module.html
- Ansible Community Documentation: Parsing semi-structured text with Ansible - https://docs.ansible.com/projects/ansible/latest/network/user_guide/cli_parsing.html
- Ansible Community Documentation: Common return values - https://docs.ansible.com/projects/ansible/13/reference_appendices/common_return_values.html
- Ansible Community Documentation: ansible.netcommon.cli_config module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/cli_config_module.html

## Issues Found
- The "Using TextFSM Templates" section claimed to use `ansible.utils.cli_parse` with TextFSM, but the example used a hand-written `regex_findall` expression instead. Updated the example to call `ansible.utils.cli_parse` with the `ansible.utils.textfsm` parser and loop over `bgp_neighbors.parsed`.
- The NTP health-check expression searched for the substring `synchronized`, which also matches `unsynchronized`. Updated it to check for `clock is synchronized` in the lowercased command output.
- The error-handling example referenced `bgp_result.rc`, but `ansible.netcommon.cli_command` documents `stdout` and JSON output rather than an `rc` return value. Replaced the condition with checks for defined `stdout` and absence of the IOS-style `Invalid input` error text.

## Review Notes
The post is technically relevant and the main `cli_command`, `prompt`, `answer`, `check_all`, `stdout`, and `stdout_lines` guidance aligns with current Ansible documentation. The TextFSM example assumes the control node has `textfsm` installed and a matching parser template available, which is consistent with the `cli_parse` documentation.
