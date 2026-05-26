# Validation Summary: How to Use the Ansible assemble Module for Config Fragments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.assemble
- ansible.builtin.file
- ansible.builtin.copy
- ansible.builtin.template
- HAProxy configuration validation
- sudoers validation with visudo
- YAML playbook syntax

## Sources Consulted
- Ansible Core documentation: ansible.builtin.assemble module: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/assemble_module.html
- Ansible Community documentation: ansible.builtin.copy module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible Community documentation: ansible.builtin.file module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible Community documentation: ansible.builtin.template module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html

## Issues Found
- The post stated that `assemble` looks for fragments on the Ansible controller by default and that `remote_src: yes` is needed for remote fragments. Current Ansible Core documentation shows `remote_src` defaults to `true`, so `src` is searched on the managed host by default. I updated the explanation and adjusted the example to show `remote_src: no` for controller-side fragments.

## Review Notes
- The examples use fully qualified collection names and quoted file modes, which align with current Ansible documentation.
- The `regexp`, `validate`, `backup`, and `delimiter` parameters are current and used correctly. The `validate` examples correctly include the required `%s` placeholder.
