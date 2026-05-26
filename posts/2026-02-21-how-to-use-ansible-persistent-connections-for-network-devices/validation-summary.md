# Validation Summary: How to Use Ansible Persistent Connections for Network Devices

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- Ansible persistent connections
- ansible.netcommon.network_cli
- ansible.netcommon.netconf
- ansible.netcommon.httpapi
- Cisco IOS Ansible modules
- Juniper Junos Ansible modules
- Arista EOS Ansible modules
- Ansible inventory and ansible.cfg configuration

## Sources Consulted
- Ansible ansible.netcommon.network_cli connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- Ansible ansible.netcommon.netconf connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/netconf_connection.html
- Ansible ansible.netcommon.httpapi connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/httpapi_connection.html
- Ansible persistent connection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/persistent_connection.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible network connection options guide: https://docs.ansible.com/projects/ansible/latest/network/getting_started/network_connection_options.html
- Cisco IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Cisco IOS command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Cisco IOS config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Junos OS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_junos.html
- junipernetworks.junos.junos_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/junipernetworks/junos/junos_config_module.html
- Arista EOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_eos.html
- arista.eos.eos_vlans module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_vlans_module.html

## Issues Found
- Updated inventory examples to use documented fully qualified connection plugin names (`ansible.netcommon.network_cli`, `ansible.netcommon.netconf`, and `ansible.netcommon.httpapi`) instead of short names.
- Clarified the Linux server comparison because Ansible's standard SSH connection can use OpenSSH ControlPersist; it is not simply an open-run-close model in all cases.
- Clarified that CLI terminal setup applies to `ansible.netcommon.network_cli`, while NETCONF uses a persistent SSH-based management session without interactive CLI terminal setup.
- Corrected the timeout descriptions for `connect_timeout` and `connect_retry_timeout` to match Ansible's persistent connection configuration behavior.
- Added a Junos collection deprecation caveat based on current official module documentation.
- Corrected the Junos confirmed commit example so `confirm_commit: true` confirms a prior confirmed commit created with `confirm: 5`.
- Replaced the invalid performance benchmark command using `-c paramiko` for IOS network modules with a documented `ansible.netcommon.network_cli` invocation and a generic legacy comparison.
- Corrected the IOS configuration example so interface subcommands are applied under `parents: interface GigabitEthernet0/1` instead of being looped as global config lines.
- Adjusted the httpapi wording to avoid overclaiming about raw HTTP session/TLS reuse and instead describe persistent API connection reuse.

## Review Notes
The `junipernetworks.junos` collection is still documented, but the official Ansible documentation marks it as deprecated and scheduled for removal from Ansible 14. New Junos automation should check the current Juniper-supported collection guidance before implementation.
