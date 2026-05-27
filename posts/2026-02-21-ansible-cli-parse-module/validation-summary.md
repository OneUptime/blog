# Validation Summary: How to Use Ansible cli_parse Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.utils `cli_parse`
- ansible.netcommon parser plugins
- NTC Templates
- TextFSM
- TTP
- pyATS/Genie
- XML parsing
- Jinja2 expressions in Ansible playbooks

## Sources Consulted
- Ansible `ansible.utils.cli_parse` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/cli_parse_module.html
- Ansible semi-structured text parsing user guide: https://docs.ansible.com/projects/ansible/latest/network/user_guide/cli_parsing.html
- Ansible `ansible.netcommon` collection plugin index: https://docs.ansible.com/ansible/latest/collections/ansible/netcommon/index.html
- NTC Templates repository and template index: https://github.com/networktocode/ntc-templates
- NTC Templates `cisco_ios_show_ip_route.textfsm`: https://raw.githubusercontent.com/networktocode/ntc-templates/master/ntc_templates/templates/cisco_ios_show_ip_route.textfsm

## Issues Found
- The post stated that the parsing engine plugins are in `ansible.netcommon`. Current Ansible documentation shows only some parser plugins there; TextFSM, TTP, and XML examples use `ansible.utils.textfsm`, `ansible.utils.ttp`, and `ansible.utils.xml`. Updated the explanation and the affected examples.
- The NTC Templates `show ip route` example referenced `item.MASK`, but the current Cisco IOS template returns `PREFIX_LENGTH`. Updated the example to use `item.PREFIX_LENGTH`.
- The error handling example used string concatenation with `+` around a potentially numeric fact. Updated it to use Jinja's `~` concatenation operator and a numeric default, which safely stringifies the values.

## Review Notes
The remaining examples are syntactically valid YAML and align with the current `cli_parse` module interface. The post could optionally mention the `parser.command` suboption for offline NTC/pyATS parsing when the parser needs a command name separate from a live command, but the existing offline TextFSM example is valid with an explicit `template_path`.
