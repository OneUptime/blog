# Validation Summary: How to Use Ansible to Configure Logging on Network Devices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible network automation
- Cisco IOS and IOS XE logging configuration
- Cisco NX-OS logging configuration
- Arista EOS logging configuration
- Syslog, severity levels, log buffers, logging source interfaces, and configuration audit playbooks

## Sources Consulted
- Ansible `cisco.ios.ios_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible `cisco.ios.ios_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible `cisco.nxos.nxos_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_config_module.html
- Ansible `arista.eos.eos_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_config_module.html
- Cisco IOS Embedded Syslog Manager Command Reference for `logging rate-limit`, severity levels, `logging host`, and discriminators: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/esm/command/esm-cr-book/book_cjab_m_escalate-a-cisco-jabber-group_chapter_00.html
- Cisco IOS Configuration Fundamentals documentation for CLI output filtering and archive logging notification: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/fundamentals/configuration/xe-3s/fundamentals-xe-3s-book/cf-cli-search.html
- Cisco Nexus NX-OS System Management Command Reference for `logging server`, `logging level`, and numeric severity levels: https://www.cisco.com/c/en/us/td/docs/switches/datacenter/nexus6000/sw/command/reference/sysmgmt/n6k-sysmgmt-cr/n6k-sm_cmds_l.html
- Arista EOS System Event Logging documentation for logging hosts, trap logging, and source interface syntax: https://www.arista.com/en/um-eos/eos-system-event-logging

## Issues Found
- The IOS rate-limit example used `except critical`, but Cisco's command reference documents numeric severity levels for `logging rate-limit ... except`. Changed the variable to `2` and referenced it from the command.
- The discriminator application command omitted the syslog host transport and port, which could fail to preserve the intended host settings when applying the discriminator. Updated it to include `transport {{ item.transport }} port {{ item.port }}`.
- The NX-OS example passed IOS-style severity words to `logging server` and `logging level`, while Cisco NX-OS documents numeric severity levels for those commands. Added a `severity_map` and used numeric values in the NX-OS commands.
- The EOS source interface command used IOS-style `logging source-interface`. Arista EOS documents source interface configuration as `logging vrf <vrf_name> local-interface <interface>`. Updated the EOS example to use `logging vrf default local-interface`.
- The verification playbook used `show logging | tail 20`, but IOS output filtering documents `begin`, `include`, and `exclude`, not Unix `tail`. Changed the command to plain `show logging`.
- The compliance score formula subtracted one from the number of passing boolean checks even though the hostname field was already excluded by `select('equalto', true)`. Removed the extra subtraction so a fully compliant device reports 100%.

## Review Notes
The examples remain intentionally generic and still assume the listed platforms support the shown logging commands. Older IOS images and some platform-specific NX-OS or EOS releases may have differences in supported logging options.
