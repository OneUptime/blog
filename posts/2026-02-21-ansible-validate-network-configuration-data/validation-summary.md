# Validation Summary: How to Use Ansible to Validate Network Configuration Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.assert, debug, fail, include_vars, and set_fact modules
- ansible.utils.validate module and jsonschema validation engine
- ansible.utils.ipaddr filter
- cisco.ios.ios_interfaces, ios_vlans, and ios_command modules
- JSON Schema
- Network configuration data validation

## Sources Consulted
- Ansible `ansible.utils.validate` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/validate_module.html
- Ansible network validation guide: https://docs.ansible.com/projects/ansible/latest/network/user_guide/validate.html
- Ansible `ansible.utils.ipaddr` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/utils/docsite/filters_ipaddr.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Cisco IOS `ios_interfaces` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_interfaces_module.html
- Cisco IOS `ios_vlans` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_vlans_module.html

## Issues Found
- The IP address validation example used `ansible.utils.ipaddr('address')` on values such as `10.1.1.1/24`. Official Ansible docs show that `address` filters host addresses without prefixes, while `host/prefix` validates host addresses with CIDR prefixes. Changed the assertion to use `ansible.utils.ipaddr('host/prefix')`.
- The duplicate-IP failure message used `all_ips | difference(all_ips | unique)`, which returns an empty list because every duplicated value is still present in the unique list. Changed the message to report the full checked IP list when the duplicate assertion fails.
- The post-deployment interface description validation skipped interfaces that were missing from gathered state, so missing desired interfaces would not be reported. Changed the assertion to fail when the interface is not found and to compare the description with a safe default.

## Review Notes
- All YAML snippets parse successfully with PyYAML after the fixes.
- `ansible` and `ansible-doc` are not installed in this workspace, so local Ansible syntax checking was not available. The review was performed against current official Ansible and Cisco IOS collection documentation.
- The `ansible.utils` collection is documented separately from `ansible-core`; users need the collection and the `netaddr` Python library for the `ipaddr` filter examples.
