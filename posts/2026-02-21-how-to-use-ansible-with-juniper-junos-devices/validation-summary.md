# Validation Summary: How to Use Ansible with Juniper JunOS Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Juniper Junos OS
- NETCONF over SSH
- Juniper Ansible collections (`junipernetworks.junos`, `juniper.device`)
- `ansible.netcommon`
- Junos configuration, commit-confirmed, rollback, and operational commands

## Sources Consulted
- Ansible community documentation: `junipernetworks.junos` collection index, including the current deprecation notice: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/index.html
- Ansible community documentation: `junipernetworks.junos.junos_config` module: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/junos_config_module.html
- Ansible community documentation: `junipernetworks.junos.junos_netconf` module: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/junos_netconf_module.html
- Ansible community documentation: `junipernetworks.junos.junos_command` module: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/junos_command_module.html
- Ansible community documentation: `junipernetworks.junos.junos_l3_interfaces` module: https://docs.ansible.com/ansible/latest/collections/junipernetworks/junos/junos_l3_interfaces_module.html
- Ansible community documentation: NETCONF-enabled platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_netconf_enabled.html
- Ansible community documentation: `ansible.netcommon.netconf` connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_connection.html
- Juniper Networks documentation: NETCONF SSH subsystem statement: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/ssh-edit-system-services-netconf.html
- Juniper Networks documentation: RFC-compliant NETCONF sessions: https://www.juniper.net/documentation/us/en/software/junos/netconf/topics/concept/netconf-session-rfc-compliant.html
- Juniper Networks documentation: Junos rollback command: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/rollback.html
- Juniper Networks documentation: Ansible for Junos OS collections and modules: https://www.juniper.net/documentation/us/en/software/junos-ansible/ansible/topics/concept/junos-ansible-modules-overview.html

## Issues Found
- The post used `junipernetworks.junos.junos_config` to enable NETCONF before NETCONF was available. Current Ansible documentation says `junos_config` requires the NETCONF system service, while `junos_netconf` is the module intended to enable the NETCONF service over a `network_cli` connection. Changed the example to use `junipernetworks.junos.junos_netconf`.
- The operational command example passed `output: json` inside an item in the `commands` list. Current `junos_command` documentation defines `commands` as strings and uses the module-level `display` parameter for output format. Changed the example to `commands: [show route summary]` with `display: json`.
- The rollback section said Junos maintains "up to 50 previous configurations by default." Juniper documentation describes the most recently committed configuration plus up to 49 previous configurations, depending on platform. Updated the wording.
- Current Ansible community documentation marks `junipernetworks.junos` as deprecated and scheduled for removal from Ansible 14. Added a prerequisite note advising readers to pin supported versions or evaluate Juniper's `juniper.device` collection for new projects.

## Review Notes
The remaining examples align with the documented module parameters and Junos configuration syntax at a documentation level. The playbooks still use placeholder inventory values and variables such as `vault_junos_password` and `router_id`, so they require normal environment-specific inventory and secret setup before execution.
