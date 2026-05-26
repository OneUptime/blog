# Validation Summary: How to Use Ansible assert Module for Testing Conditions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- ansible.builtin.assert
- ansible.builtin.wait_for
- ansible.builtin.uri
- ansible.builtin.command
- Ansible facts and registered task results

## Sources Consulted
- Ansible assert module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- Ansible uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible tests documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tests.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- ansible-playbook CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-playbook.html

## Issues Found
- The input validation example used `app_port` in numeric assertions without first checking that it was defined. Added `app_port is defined` so the required variable validation is complete.
- The pre-flight playbook used `rabbitmq_host` in `required_ports` but did not include it in the required variable assertion. Added `rabbitmq_host is defined`.
- The OS support assertion listed both Ubuntu and Debian but required `ansible_distribution_major_version | int >= 20`, which incorrectly rejects Debian releases such as Debian 11 and 12. Changed the condition to check Ubuntu 20+ or Debian 11+.
- The role validation example used `postgresql_max_connections` in a numeric assertion without first checking that it was defined. Added `postgresql_max_connections is defined`.

## Review Notes
Ansible was not installed in the local environment, so examples were reviewed against official Ansible documentation rather than by running `ansible-playbook --syntax-check`. The `quiet` parameter is available in current Ansible and was added in Ansible 2.8; `fail_msg` and `success_msg` were added in Ansible 2.7.
