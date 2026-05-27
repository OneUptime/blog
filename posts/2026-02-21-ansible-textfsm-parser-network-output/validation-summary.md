# Validation Summary: How to Use Ansible TextFSM Parser for Network Output

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.utils cli_parse
- ansible.netcommon parser plugins and filters
- TextFSM
- NTC Templates
- Cisco IOS network automation

## Sources Consulted
- Ansible `ansible.utils.cli_parse` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/cli_parse_module.html
- Ansible network CLI parsing guide: https://docs.ansible.com/projects/ansible/latest/network/user_guide/cli_parsing.html
- Ansible `ansible.netcommon.parse_cli_textfsm` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/parse_cli_textfsm_filter.html
- Google TextFSM documentation: https://github.com/google/textfsm/wiki/TextFSM
- NTC Templates library documentation: https://ntc-templates.readthedocs.io/en/latest/user/lib_getting_started/
- NTC Templates `parse_output` source: https://github.com/networktocode/ntc-templates/blob/master/ntc_templates/parse.py
- Ansible `ntc_templates` parser plugin source: https://github.com/ansible-collections/ansible.netcommon/blob/main/plugins/sub_plugins/cli_parser/ntc_templates_parser.py
- Ansible `textfsm` parser plugin source: https://github.com/ansible-collections/ansible.utils/blob/main/plugins/sub_plugins/cli_parser/textfsm_parser.py
- NTC Templates Cisco IOS templates, including `show ip route`, `show ip interface brief`, and `show version`: https://github.com/networktocode/ntc-templates/tree/master/ntc_templates/templates

## Issues Found
- The post claimed `parse_cli_textfsm` auto-detects NTC templates and used it without a template argument. Current Ansible documentation shows that filter requires a template path and is deprecated in favor of `ansible.utils.cli_parse`. Replaced the example with `ansible.utils.cli_parse` using the `ansible.netcommon.ntc_templates` parser and an explicit command.
- The NTC Templates examples used uppercase result keys such as `PROTOCOL`, `NETWORK`, `MASK`, `NEXTHOP_IP`, `HOSTNAME`, and `STATUS`. NTC Templates' `parse_output` returns dictionary keys lowercased, and the current Cisco IOS route template uses `prefix_length` rather than `mask`. Updated the examples to use lowercase keys and `prefix_length`.
- The inventory used `ansible_network_os=cisco_ios`. Updated it to the collection-style value `cisco.ios.ios`, which the Ansible NTC parser maps to `cisco_ios`.
- The custom `show ip interface brief` TextFSM template would parse the command header as a data record and split `administratively down` incorrectly. Added a header-skip rule and constrained `STATUS` and `PROTOCOL` to expected values.
- The custom CDP detail TextFSM template relied on an empty line to record neighbors and captured only the first character of the version string because the regex was non-greedy without an end anchor. Updated it to capture a version block as a TextFSM list and record at the `advertisement version` delimiter.
- The custom TextFSM playbook used the deprecated `parse_cli_textfsm` filter. Replaced it with `ansible.utils.cli_parse` and the current `ansible.utils.textfsm` parser.
- The `cli_parse` TextFSM example used `ansible.netcommon.textfsm`; current Ansible documentation uses `ansible.utils.textfsm`. Updated the parser name.

## Review Notes
The TextFSM templates included in the post were syntax-checked with the current `textfsm` Python package. Ansible itself is not installed in this workspace, so Ansible playbook execution was not run locally; examples were verified against current official Ansible documentation and relevant parser source.
