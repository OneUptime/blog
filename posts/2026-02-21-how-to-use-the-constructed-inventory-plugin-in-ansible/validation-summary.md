# Validation Summary: How to Use the Constructed Inventory Plugin in Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible inventory plugins
- `ansible.builtin.constructed`
- Jinja2 inventory expressions
- Ansible CLI commands
- YAML and INI inventory configuration

## Sources Consulted
- Ansible `ansible.builtin.constructed` inventory plugin documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/constructed_inventory.html
- Ansible inventory guide, including inventory directory load order and variable merging: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Ansible `ansible-inventory` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-inventory.html
- Ansible core developer guide for constructed inventory feature execution order: https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_inventory.html

## Issues Found
- The post stated that the constructed plugin runs after all other inventory sources and has access to every host and variable. The official documentation says constructed expressions can use only variables already available from previous inventory sources or the fact cache, and inventory source order determines what has already loaded. I updated the wording to make the ordering dependency explicit.
- The setup section said to create a file ending in `.yml`. The plugin uses a YAML inventory plugin configuration file; `.yaml` and other valid plugin source naming patterns can also be used depending on inventory parsing. I changed the wording to avoid implying that only `.yml` is valid.
- The multi-cloud example composed `backup_enabled` from the `webservers` and `databases` groups created in the same constructed source. Constructed features run compose before composed groups, so that expression would not reliably see groups created later in the same file. I changed the expression to use the source groups that already exist before the constructed plugin processes the host.

## Review Notes
- The examples assume facts such as `ansible_os_family` or package data are available as host variables, usually from a previous inventory source or a configured fact cache. Without those variables, `strict: false` allows failed expressions to be skipped.
- The local environment did not have the `ansible` executable installed, so command behavior was verified against official Ansible CLI documentation rather than local `--help` output.
