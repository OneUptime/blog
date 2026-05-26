# Validation Summary: How to Use the Generator Inventory Plugin in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible inventory plugins
- `ansible.builtin.generator`
- `ansible-inventory`
- YAML inventory configuration
- Ansible inventory variables and groups

## Sources Consulted
- Ansible documentation: `ansible.builtin.generator` inventory plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/generator_inventory.html
- Ansible Core documentation: Inventory plugins, https://docs.ansible.com/projects/ansible-core/devel/plugins/inventory.html
- Ansible documentation: Configuration setting `INVENTORY_ENABLED`, https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#inventory-enabled
- Ansible documentation: Building inventories and passing multiple inventory sources, https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Local executable check with `ansible-core` 2.20.6 using `ansible-doc -t inventory ansible.builtin.generator`, `ansible-config dump`, and `ansible-inventory`.

## Issues Found
- The post said the generator plugin is not enabled by default and showed `enable_plugins` with only generator, YAML, and INI plugins. Current Ansible commonly loads YAML plugin configuration files through the default `auto` inventory plugin, and changing `enable_plugins` overrides the default list. I updated the text and example to preserve the default inventory plugins while appending `ansible.builtin.generator`.
- Several generator YAML examples included `strict: false`, which is not a documented option for `ansible.builtin.generator`. I removed it from the examples.
- The first example used `environment` as an inventory variable name, which Ansible warns is reserved. I changed the layer variable to `env` and the explicit variable to `deployment_env`.
- Some generated group names used hyphens, which Ansible warns are invalid group-name characters. I changed generated group names in the examples to use underscores or a Jinja `replace('-', '_')` filter while preserving hostnames.
- The verification commands mixed `inventory/generator.yml` with a host that only exists in `inventory/generator-with-vars.yml`. I corrected the commands so the graph, list, and host checks use the same inventory file.
- The graph output omitted the `worker` group from the shown `role` layer values and used the old hyphenated region group names. I updated the example graph.
- The limitations section incorrectly said layer values must be strings. Numeric layer values work in Ansible, but values must be explicitly listed and strings are needed when formatting matters, such as leading zeros. I corrected that wording.

## Review Notes
The generator inventory plugin documentation still includes examples that mention enabling the plugin, but current Ansible inventory plugin documentation clarifies that YAML configuration sources can be handled by the default `auto` plugin. The post now presents explicit enabling as necessary when users customize `enable_plugins`, which is the least surprising guidance for current Ansible behavior.
