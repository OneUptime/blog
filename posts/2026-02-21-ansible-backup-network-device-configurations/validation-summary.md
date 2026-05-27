# Validation Summary: How to Use Ansible to Backup Network Device Configurations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible network automation with `network_cli`
- Cisco IOS, Cisco NX-OS, and Arista EOS Ansible collections
- Ansible built-in `file`, `copy`, `command`, `debug`, and `cron` modules
- Git-based configuration versioning
- Cron scheduling

## Sources Consulted
- Ansible `cisco.ios.ios_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible `cisco.ios.ios_command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible `cisco.nxos.nxos_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/nxos/nxos_config_module.html
- Ansible `arista.eos.eos_config` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/arista/eos/eos_config_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The git backup example targeted `all_network` while only capturing Cisco IOS configurations and skipped capture for non-IOS hosts. The following copy task would still reference `running_config.stdout[0]` for skipped hosts. Changed the play to target `ios_devices`, matching the IOS-specific module usage.
- The git backup example wrote to `{{ git_repo_path }}/configs/{{ inventory_hostname }}.cfg` without ensuring the `configs` directory existed. Added an `ansible.builtin.file` task to create it before writing files.
- The diff backup example wrote files into `current` and `previous` directories without creating those directories first. Added an `ansible.builtin.file` task to create both directories before copy and diff tasks run.
- The unsaved-config check compared only the lengths of running and startup configs, which can miss different configurations with the same character count. Changed it to compare the captured config content directly and updated the task name/message accordingly.

## Review Notes
- The Cisco IOS, Cisco NX-OS, and Arista EOS `*_config` backup examples use current fully qualified collection module names and documented `backup_options` fields.
- The local YAML snippets parse successfully with PyYAML. `ansible-playbook` was not installed in the review environment, so full Ansible syntax checking could not be run locally.
