# Validation Summary: How to Use Ansible to Manage Network Device Firmware

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible network automation with `network_cli`
- `cisco.ios` collection modules
- Cisco IOS / IOS XE firmware image staging and verification
- Cisco IOS / IOS XE boot variables and reload workflow

## Sources Consulted
- Ansible `cisco.ios.ios_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible `cisco.ios.ios_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible network command output and prompt handling guide: https://docs.ansible.com/projects/ansible/latest/network/user_guide/network_working_with_command_output.html
- Ansible network connection options documentation: https://docs.ansible.com/projects/ansible/latest/network/getting_started/network_connection_options.html
- Ansible `ansible.builtin.wait_for` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.file` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Cisco IOS XE Software Integrity Assurance guidance: https://sec.cloudapps.cisco.com/security/center/resources/ios_xe_integrity_assurance.html
- Cisco IOS XE system management / flash file system documentation: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-3/configuration_guide/sys_mgmt/b_173_sys_mgmt_9300_cg/working_with_the_flash_file_system.html

## Issues Found
- The IOS commands `dir flash: | include free` and `show processes cpu | include CPU` were unquoted, which makes the YAML invalid because `|` is parsed as a block scalar indicator. I quoted both command strings so the snippets parse as valid YAML.
- The firmware variables defined `file_server_protocol`, but the staging command hardcoded `scp://`. I changed the command to use `{{ firmware.file_server_protocol }}` so the configuration variable is actually honored.
- The copy tasks wrote report files under `reports/pre-upgrade` and `reports/post-upgrade`, but `ansible.builtin.copy` does not create a missing parent directory when `dest` is a file path. I added `ansible.builtin.file` tasks to create those local report directories before writing the reports.
- The reload task tried to answer both a save prompt and a confirmation prompt even though the playbook saves the configuration immediately beforehand. I simplified it to answer the expected `[confirm]` prompt with a carriage return, matching the Ansible prompt-handling examples.

## Review Notes
- The workflow is technically sound for Cisco IOS / IOS XE devices using the `cisco.ios` collection, but real production upgrades may need platform-specific handling for install mode versus bundle mode, stack members, HA pairs, ROMMON variables, and rollback procedures.
- The post uses MD5 because Cisco IOS XE documents `verify /md5` for image integrity checks. Where available, stronger vendor-published image verification methods should be preferred.
