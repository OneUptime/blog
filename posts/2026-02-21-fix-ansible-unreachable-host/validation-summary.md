# Validation Summary: How to Fix Ansible UNREACHABLE Host Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible
- Ansible inventory and connection variables
- Ansible playbooks and error handling
- SSH and OpenSSH client options
- Linux networking diagnostics
- Linux firewalls, UFW, and AWS security groups

## Sources Consulted
- Ansible error handling in playbooks: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Ansible inventory guide and behavioral inventory parameters: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible SSH connection plugin settings: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Ansible ping module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/ping_module.html
- Ansible setup module and fact subsets: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible task result tests, including unreachable results: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible unreachable test plugin: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/unreachable_test.html
- Ansible hostname module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- community.general timezone module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general UFW module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible cron module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The `ansible.cfg` example used `retries = 3` under `[defaults]`, but current Ansible SSH retry configuration is under `[connection]` or `[ssh_connection]`. Changed the snippet to put retries under `[connection]` and `[ssh_connection]`.
- The unreachable-host example checked `ping_result is not failed`, which can misclassify an unreachable result because Ansible has a specific unreachable result test. Changed it to `ping_result is not unreachable`.
- The infrastructure example used `ansible.builtin.timezone`, but timezone management is provided by `community.general.timezone` in current documentation. Updated the FQCN.
- The "Common Use Cases" intro referred to "this module" even though the post is about unreachable host troubleshooting, not a module. Updated those references to "these techniques" / playbooks.

## Review Notes
The post is technically relevant and valid after the fixes. Some commands are platform-dependent, such as `traceroute`, `iptables`, `/var/log/auth.log`, and the SSH service name, but they are reasonable Linux troubleshooting examples rather than Ansible API errors.
