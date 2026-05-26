# Validation Summary: How to Iterate Over Complex Data Structures in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible loops and loop_control
- Ansible filters: dict2items, subelements, product, selectattr, rejectattr
- Ansible modules: ansible.builtin.user, ansible.builtin.file, ansible.posix.authorized_key, ansible.builtin.apt, ansible.builtin.template, community.general.ufw
- YAML
- Jinja2 templating filters

## Sources Consulted
- Ansible dict2items filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/dict2items_filter.html
- Ansible subelements filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/subelements_filter.html
- Ansible product filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/product_filter.html
- Ansible selectattr filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/selectattr_filter.html
- Ansible loops and loop_control documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible authorized_key module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/posix/authorized_key_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html

## Issues Found
- The deeply nested structure examples used `subelements('environments | dict2items')`. The `subelements` filter expects a property label to extract from each parent item, not a filter expression. I changed the example data so `environments` is a list of environment dictionaries, then updated both loops to use `subelements('environments')` and adjusted the field references from `item.1.key` / `item.1.value.*` to `item.1.name` / `item.1.*`.
- The task name "Display all application-environment-port combinations" implied one loop iteration per port, but the task displayed each environment's port list. I changed the task name to "Display all application-environment port lists" to match the actual loop behavior.

## Review Notes
- The `ansible.posix.authorized_key` and `community.general.ufw` modules are not included in `ansible-core`; they require their respective collections. The `community.general.ufw` module also requires the target host's `ufw` package.
- The examples use short filter names such as `dict2items`, `subelements`, `product`, and `selectattr`. Official documentation recommends fully qualified collection names for linkability and conflict avoidance, but the short names remain valid in normal Ansible use.
