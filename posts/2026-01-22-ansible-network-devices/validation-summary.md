# Validation Summary: How to Configure Ansible for Network Devices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy collections
- Ansible network automation
- Cisco IOS / IOS-XE
- Cisco NX-OS
- Cisco ASA
- Juniper Junos
- Arista EOS
- NETCONF
- SSH / network_cli

## Sources Consulted
- Ansible Cisco IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible Junos platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_junos.html
- ansible.netcommon.network_cli connection plugin: https://docs.ansible.com/projects/ansible/latest/collections/ansible/netcommon/network_cli_connection.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- cisco.ios.ios_system module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_system_module.html
- cisco.ios.ios_ntp_global module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_ntp_global_module.html
- cisco.nxos.nxos_interfaces module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_interfaces_module.html
- cisco.nxos.nxos_l2_interfaces module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_l2_interfaces_module.html
- cisco.nxos.nxos_vlans module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_vlans_module.html
- cisco.ios.ios_ospfv2 module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_ospfv2_module.html
- cisco.ios.ios_static_routes module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_static_routes_module.html
- cisco.ios.ios_acls module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_acls_module.html
- cisco.ios.ios_config module: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Cisco ASA collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/asa/index.html

## Issues Found
- The installation commands configured Cisco ASA inventory but did not install the Cisco ASA collection. Added `ansible-galaxy collection install cisco.asa`.
- The dependency command installed `paramiko`, but the current `network_cli` docs recommend `ansible-pylibssh` for libssh and mark Paramiko transport as deprecated after 2028-02-01. Replaced `paramiko` with `ansible-pylibssh`.
- The Junos NETCONF inventory used `ansible.netcommon.netconf`, but the dependency list omitted `ncclient`, which the Junos platform docs require. Added `ncclient`.
- The `ansible.cfg` example used a non-standard `[network] diff_mode = true` setting. Replaced it with the documented `[diff] always = true` setting.
- The IOS ACL example used unsupported `destination_port` keys. Moved port matches under `destination.port_protocol`, as required by `cisco.ios.ios_acls`.
- The IOS ACL example used `log: true`, but the module expects a `log` dictionary with `set: true`. Updated the ACL entry accordingly.
- The IOS ACL example omitted `acl_type` for a named extended ACL. Added `acl_type: extended`.
- The backup play disabled fact gathering but used `ansible_date_time.date`, which is only available when facts are gathered. Replaced it with a controller-side `ansible.builtin.pipe` lookup using `date +%F`.
- The restore example used `replace: config`, which is not a valid `cisco.ios.ios_config` value. Changed it to `replace: line`.
- The compliance play targeted `hosts: all` while using IOS-only modules and IOS running-config assertions. Scoped it to `hosts: routers`.

## Review Notes
The backup example still only includes backup tasks for IOS, NX-OS, and Junos devices; Cisco ASA firewalls in the sample inventory would be skipped unless an ASA-specific backup task is added later.
