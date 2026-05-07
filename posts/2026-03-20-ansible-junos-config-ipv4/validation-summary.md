# Validation Summary: How to Use Ansible junos_config for IPv4 on Juniper Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Juniper Junos
- NETCONF
- IPv4 interface configuration
- Static routing
- XML device configuration

## Sources Consulted
- Ansible `junipernetworks.junos.junos_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/junos_config_module.html
- Ansible Junos OS Platform Options: https://docs.ansible.com/projects/ansible/10/network/user_guide/platform_junos.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Juniper Protocol Family and Interface Address Properties: https://www.juniper.net/documentation/us/en/software/junos/interfaces-fundamentals/topics/topic-map/protocol-family-interface-address-properties.html
- Juniper `static` routing-options CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/static-edit-routing-options.html

## Issues Found
- The inventory used outdated connection settings. I changed `ansible_network_os=junos` to `ansible_network_os=junipernetworks.junos.junos` and `ansible_connection=netconf` to `ansible_connection=ansible.netcommon.netconf` to match the current Ansible platform documentation.
- The post omitted a required dependency and prerequisite. I added the `ncclient` requirement and noted that NETCONF must be enabled on the device, because the current `junos_config` module documentation requires both.
- The rollback example incorrectly mixed `lines` with `rollback: 0`. I replaced it with a valid commit-confirm workflow using `confirm: 5` and `confirm_commit: true`, because `rollback` is a separate rollback operation and not the same as commit-confirmed rollback protection.
- The backup example used an unsupported `retrieve: running` parameter. I removed it and kept the supported `backup` and `backup_options` arguments documented for `junos_config`.
- The description claimed the post used Jinja2 templates, but the example actually uses an XML source file with `src` and `src_format: xml`. I corrected that wording.
- I normalized the product name from `JunOS` to `Junos` in the lines I touched for naming accuracy.

## Review Notes
- The `junipernetworks.junos` collection is deprecated in the current Ansible documentation and is scheduled for removal in Ansible 14.
- The post’s use of `--check --diff` is valid for dry runs. If device-side commit syntax validation is needed, Ansible also documents the module-specific `check_commit: true` option.
- The inventory still shows a plain-text password for brevity. Official Ansible guidance recommends SSH keys or Ansible Vault for real environments.
