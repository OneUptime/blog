# Validation Summary: How to Use Ansible netconf_config Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.netcommon collection
- NETCONF
- YANG
- XML
- Junos OS
- Cisco IOS-XE NETCONF/YANG payloads

## Sources Consulted
- Ansible ansible.netcommon.netconf_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_config_module.html
- Ansible ansible.netcommon.netconf connection plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_connection.html
- Ansible ansible.netcommon.netconf_rpc module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_rpc_module.html
- Ansible ansible.netcommon.netconf_get module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_get_module.html
- Ansible network platform options documentation: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_index.html
- Ansible NETCONF platform guide: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_netconf_enabled.html
- RFC 6241, Network Configuration Protocol (NETCONF): https://www.rfc-editor.org/rfc/rfc6241
- RFC 6242, Using the NETCONF Protocol over Secure Shell (SSH): https://www.rfc-editor.org/rfc/rfc6242

## Issues Found
- The NETCONF fundamentals section said RFC 6241 uses SSH as its transport. RFC 6241 defines NETCONF itself, while RFC 6242 defines NETCONF over SSH. Updated the wording to distinguish the protocol from its SSH transport mapping.
- The transactional and rollback bullets were overbroad because NETCONF datastore, rollback-on-error, candidate, and confirmed-commit behavior depends on server capabilities. Updated those bullets to describe the capability-dependent behavior accurately.
- The inventory example set `ansible_network_os: cisco.ios.ios` for an IOS-XE NETCONF example, but Ansible's current platform matrix does not list NETCONF as a supported connection for the Cisco IOS platform entry. Changed it to the generic `default` NETCONF plugin for a generic IOS-XE NETCONF endpoint.
- The install commands only installed `ncclient`, but the post later uses `ansible.netcommon.netconf_rpc`, whose module requirements include `jxmlease`. Updated the command to install both `ncclient` and `jxmlease`.
- A candidate datastore example comment said it committed "with a comment", but `ansible.netcommon.netconf_config` has no commit-comment parameter in the shown task. Changed the comment to say it commits the candidate config.
- The confirmed-commit example attempted to confirm a previous commit by sending `netconf_rpc` with `<confirmed/>`, which requests another confirmed commit rather than confirming the prior one. Replaced it with `ansible.netcommon.netconf_config` and `confirm_commit: true`, which the module documents as the way to confirm a previous commit.

## Review Notes
The examples are still device-model dependent: XML payloads must match the target device's supported YANG/native model and NETCONF capability set. The post now reflects those capability caveats without changing its structure.
