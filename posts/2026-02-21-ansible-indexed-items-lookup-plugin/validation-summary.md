# Validation Summary: How to Use the Ansible indexed_items Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- Ansible loops and `loop_control.index_var`
- YAML playbooks
- Jinja2 templating in Ansible
- systemd unit files
- HAProxy and Nginx configuration generation examples

## Sources Consulted
- Ansible official documentation: `ansible.builtin.indexed_items` lookup plugin, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/indexed_items_lookup.html
- Ansible official documentation: Loops, `loop`, `with_indexed_items`, and `loop_control.index_var`, https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible official documentation: Lookup plugins, `query`, and `wantlist=True`, https://docs.ansible.com/projects/ansible/8/plugins/lookup.html
- Local installed Ansible package source for `ansible.plugins.lookup.indexed_items.LookupModule.run`, version 2.21.0

## Issues Found
- The post stated that `item.0` is returned as a string. The current Ansible implementation returns `list(zip(range(len(items)), items))`, so the index is numeric. Changed the tip to say that `item.0` is numeric and that `| int` is only defensive in the examples.

## Review Notes
The short lookup name `indexed_items` is valid, but Ansible's current plugin documentation recommends the fully qualified collection name `ansible.builtin.indexed_items` for clarity and to avoid collection name conflicts. The post's examples are still technically valid as written.
