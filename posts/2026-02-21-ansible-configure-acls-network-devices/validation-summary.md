# Validation Summary: How to Use Ansible to Configure ACLs on Network Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Cisco IOS and IOS XE
- Cisco IOS ACLs
- `cisco.ios.ios_acls`
- `cisco.ios.ios_config`
- `cisco.ios.ios_command`
- Ansible Jinja2 templating and filters

## Sources Consulted
- Ansible `cisco.ios.ios_acls` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_acls_module.html
- Ansible `cisco.ios.ios_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible `ansible.builtin.subelements` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Cisco IOS XE ACL overview documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_data_acl/configuration/xe-16-11/sec-data-acl-xe-16-11-book/sec-access-list-ov.html
- Cisco Catalyst ACL configuration guide: https://www.cisco.com/c/en/us/td/docs/switches/lan/c9000/security/acls/acls-configuration-guide/access-control-lists.html

## Issues Found
- The ACL basics section listed only the original numbered IPv4 ACL ranges. Updated the ranges to include expanded standard ACL numbers `1300-1999` and expanded extended ACL numbers `2000-2699`, matching Cisco documentation.
- The `ios_acls` examples used `protocol_options.tcp.eq` and `protocol_options.udp.eq` for TCP and UDP port matching. Updated these to `destination.port_protocol.eq`, which is the documented schema for destination port matching in `cisco.ios.ios_acls`.
- The `ios_acls` examples used a singular `remark` field. Updated these to the documented `remarks` list field.
- The `ios_acls` example used `log: true`. Updated this to `log.set: true`, matching the module's structured logging option.
- The `ios_config` ACL example used unsequenced ACL lines with `match: exact`, which can be non-idempotent because IOS stores named ACL entries with sequence numbers. Added explicit sequence numbers to the ACL lines.
- The variable-driven `ios_config` example rendered a Jinja-built list through a folded scalar, which would pass a string instead of a list of commands. Reworked it to loop over entries and pass an actual list of command lines to `ios_config`.
- The audit example chained `subelements('acls')` and `subelements('aces')` in a way that would not preserve the expected item shape for ACL/ACE iteration. Updated it to flatten the gathered ACL list first, then apply `subelements('aces')`.
- The cleanup example deleted the ACL before removing it from the interface, despite saying the interface reference should be removed first. Reordered the tasks so the ACL is detached before deletion.

## Review Notes
The examples remain Cisco IOS/IOS XE focused and assume the `cisco.ios` collection is installed and devices are reachable with `network_cli`. The `ios_acls` documentation notes that ACE sequence numbers should be specified for idempotent behavior, which the resource-module examples now do.
