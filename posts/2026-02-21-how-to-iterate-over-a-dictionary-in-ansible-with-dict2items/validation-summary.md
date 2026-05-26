# Validation Summary: How to Iterate Over a Dictionary in Ansible with dict2items

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible loops
- Ansible `dict2items` and `items2dict` filters
- Jinja2 filters
- Ansible built-in modules: `debug`, `set_fact`, `lineinfile`, `template`, `apt`, `systemd`, `service`
- `ansible.posix` modules: `sysctl`, `firewalld`

## Sources Consulted
- Ansible `ansible.builtin.dict2items` filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- Ansible `items2dict` filter documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/items2dict_filter.html
- Ansible loops documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html
- Ansible `ansible.posix.sysctl` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/sysctl_module.html
- Ansible `ansible.posix.firewalld` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/firewalld_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/8/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The complete playbook used `redis` as the dictionary key, and the same key was passed to `ansible.builtin.systemd` as the service name, while the handler correctly restarted `redis-server`. Changed the dictionary key and handler name to `redis-server` so the loop, notification, and service unit name are consistent.
- The complete playbook's `ansible.posix.firewalld` task set `permanent: yes` without `immediate: yes`. Current module documentation states runtime application is controlled by `immediate`, and it defaults to false for permanent changes. Added `immediate: yes` so the task actually applies the port changes immediately as the task name describes.

## Review Notes
- The filter examples are technically correct. The `key_name` and `value_name` parameters are available for `dict2items`, and `items2dict` is the documented reverse transformation.
- `ansible.builtin.systemd` remains available as an alias, though current documentation names `ansible.builtin.systemd_service` as the canonical module.
