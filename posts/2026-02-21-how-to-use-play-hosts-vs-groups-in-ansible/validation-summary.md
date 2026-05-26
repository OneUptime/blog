# Validation Summary: How to Use play_hosts vs groups in Ansible

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- Ansible inventory
- Ansible magic variables and facts
- Ansible playbook YAML
- Jinja2 templating in Ansible

## Sources Consulted
- Ansible Community Documentation: Special Variables - https://docs.ansible.com/projects/ansible/latest/reference_appendices/special_variables.html
- Ansible Community Documentation: Discovering variables, facts and magic variables - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible Community Documentation: Controlling where tasks run: delegation and local actions - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible Community Documentation: ansible.builtin.systemd_service module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible Community Documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible Community Documentation: ansible.builtin.uri module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html

## Issues Found
- The introduction described `play_hosts` as a shorthand for `ansible_play_hosts`. Older Ansible documentation marks `play_hosts` as deprecated, and current documentation describes `ansible_play_hosts` as the supported variable. Updated the text to recommend `ansible_play_hosts` and identify `play_hosts` as deprecated.
- The rolling update example used `ansible.builtin.systemd`. Current Ansible documentation states that this is a redirect/alias to `ansible.builtin.systemd_service`. Updated the example to use `ansible.builtin.systemd_service`.
- The combined `groups` and `ansible_play_hosts` example used a `regex_replace` expression that evaluated the active-host membership test once rather than once per host. Rewrote the example to build the list with a loop so each inventory host is checked against `ansible_play_hosts`.

## Review Notes
The main explanations of `groups`, `group_names`, `inventory_hostname`, `ansible_play_hosts`, and delegation behavior match the official Ansible documentation. The database-host template example assumes database host facts are available through gathered or cached facts; otherwise it falls back to hostnames for the IP address but still relies on inventory variables for custom values such as `db_role`.
