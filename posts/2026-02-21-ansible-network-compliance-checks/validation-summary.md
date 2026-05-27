# Validation Summary: How to Use Ansible to Perform Network Compliance Checks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible network automation
- Cisco IOS Ansible collection
- Cisco IOS configuration compliance checks
- YAML
- Mermaid flowcharts

## Sources Consulted
- Ansible cisco.ios.ios_command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_command_module.html
- Ansible cisco.ios.ios_config module documentation: https://docs.ansible.com/projects/ansible/latest/collections/cisco/ios/ios_config_module.html
- Ansible Cisco IOS platform options: https://docs.ansible.com/projects/ansible/latest/network/user_guide/platform_ios.html
- Ansible ansible.builtin.assert module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html

## Issues Found
- Added `ansible_network_os: cisco.ios.ios` to the playbooks using `network_cli`, matching the Cisco IOS platform options required for Ansible to load the correct network platform plugins.
- Fixed substring-based forbidden-service checks that could falsely fail compliant configurations such as `no ip http server` and `no ip source-route`. The examples now normalize configuration lines and check exact command lines where negated commands matter.
- Fixed the telnet compliance check so `transport input ssh telnet` does not pass just because it contains the substring `transport input ssh`.
- Updated HTTP compliance checks to verify that enabled `ip http server` and `ip http secure-server` commands are absent, instead of requiring only the explicit `no ip http server` line.
- Updated remediation `when` conditions for HTTP server and IP source routing to use exact normalized line checks.
- Added `ansible.builtin.file` tasks to create `reports/compliance` before using `ansible.builtin.copy`, because the copy module does not create the parent directory when writing a file destination.

## Review Notes
The YAML snippets parse successfully. Ansible is not installed in this local environment, so `ansible-playbook --syntax-check` could not be run. The examples are Cisco IOS-focused and intentionally use direct running-config text checks; future improvements could use structured resource modules or TextFSM/pyATS parsing for more robust multi-platform compliance logic.
