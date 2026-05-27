# Validation Summary: How to Parse Network Device Output with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible network collections
- Cisco IOS and NX-OS Ansible modules
- Juniper Junos Ansible module
- TextFSM
- NTC Templates
- CLI parsing and structured XML/JSON output

## Sources Consulted
- Ansible `ansible.netcommon.parse_cli` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/parse_cli_filter.html
- Ansible `ansible.netcommon.parse_cli_textfsm` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/parse_cli_textfsm_filter.html
- Ansible `ansible.utils.cli_parse` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/cli_parse_module.html
- Ansible CLI parsing user guide: https://docs.ansible.com/ansible/latest/network/user_guide/cli_parsing.html
- Ansible `cisco.ios.ios_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible `cisco.nxos.nxos_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_command_module.html
- Ansible `junipernetworks.junos.junos_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/junos_command_module.html
- Ansible variable notation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- NTC Templates `cisco_ios_show_version.textfsm`: https://raw.githubusercontent.com/networktocode/ntc-templates/master/ntc_templates/templates/cisco_ios_show_version.textfsm
- NTC Templates `cisco_ios_show_ip_interface_brief.textfsm`: https://raw.githubusercontent.com/networktocode/ntc-templates/master/ntc_templates/templates/cisco_ios_show_ip_interface_brief.textfsm
- NTC Templates `cisco_ios_show_ip_route.textfsm`: https://raw.githubusercontent.com/networktocode/ntc-templates/master/ntc_templates/templates/cisco_ios_show_ip_route.textfsm

## Issues Found
- The post described `parse_cli` as something Ansible ships directly. Updated this to state that it is provided by the `ansible.netcommon` collection and is deprecated in current collection docs, with `ansible.utils.cli_parse` recommended for new playbooks.
- The `parse_cli` spec used an `items` value of `{{ item }}` plus a separate `regexp` and referenced capture groups `\5` and `\6` even though the regex only had four groups. Replaced it with a valid named-group `items` regex matching `show ip interface brief`.
- The `parse_cli` example used the short filter name. Updated it to `ansible.netcommon.parse_cli` to match current collection documentation.
- The `parse_cli_textfsm` section claimed NTC templates are used by default if installed. Updated the example to pass an explicit TextFSM template path, and noted that the filter is deprecated in favor of `ansible.utils.cli_parse`.
- The `cli_parse` TextFSM parser used `ansible.netcommon.textfsm`. Updated it to the current documented parser name, `ansible.utils.textfsm`.
- The `cli_parse` route display used field names `NETWORK`, `MASK`, and `NEXTHOP`, which do not match the documented `cli_parse`/NTC output style or the NTC route template fields. Updated the example to use `network`, `prefix_length`, and `nexthop_ip`/`nexthop_if`.
- The structured-output section was titled as if it used `xmltodict`, but the examples use module-native XML/JSON handling. Renamed the heading to "Using Structured Output".
- The NX-OS JSON example used `show vlan brief | json` and then accessed hyphenated keys with dot notation. Updated it to request JSON output through `cisco.nxos.nxos_command`'s documented `output: json` command form and bracket notation for hyphenated keys.
- The inventory example used uppercase NTC field names and `INTF`, which does not match current `cli_parse` NTC output conventions. Updated it to lowercase field names such as `hostname`, `version`, `serial`, `interface`, and `status`.

## Review Notes
- The older `parse_cli` and `parse_cli_textfsm` filters remain documented, but current docs mark both as deprecated with removal after 2027-02-01. The post now keeps them for legacy context and points new work to `ansible.utils.cli_parse`.
- The playbook snippets remain illustrative and still require the relevant Ansible collections, device inventory variables such as `ansible_network_os`, and reachable network devices to run end to end.
