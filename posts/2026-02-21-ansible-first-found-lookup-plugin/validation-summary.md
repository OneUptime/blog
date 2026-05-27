# Validation Summary: How to Use the Ansible first_found Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.first_found lookup plugin
- Ansible lookup plugins
- Ansible copy, template, include_vars, package, and service modules
- Ansible roles and task search paths
- YAML playbook syntax

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.first_found lookup - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/first_found_lookup.html
- Ansible Community Documentation: Search paths in Ansible - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible Community Documentation: Lookup plugins - https://docs.ansible.com/projects/ansible/latest/plugins/lookup.html
- Ansible Community Documentation: Loops - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_loops.html
- Ansible Community Documentation: ansible.builtin.copy module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible Community Documentation: ansible.builtin.template module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible Community Documentation: ansible.builtin.include_vars module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible Community Documentation: ansible.builtin.package module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html
- Ansible Community Documentation: ansible.builtin.service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The post said `first_found` can return a default value when no files exist. The official plugin behavior is to fail by default, return an empty list with `skip=True`, or return ignored-error values when `errors='ignore'` is used. Updated the wording to describe empty/ignored results instead of a default value.
- The post described `paths` search order as path-first, then file. Official documentation states that the `files` list has precedence over searched paths. Updated the parameter description and multi-path example search order.
- The path-resolution tip oversimplified relative path lookup as playbook-directory or role `files`/`templates` resolution. Updated it to match Ansible's task search path behavior, including role subdirectories and fallback through task and play locations.
- The post implied `with_first_found` belonged to older Ansible versions. Official loop documentation says `with_<lookup>` syntax is still valid and not deprecated. Updated the wording to say some playbooks use it as a loop construct while `lookup('first_found', ...)` is useful in template contexts.

## Review Notes
- The examples use the short lookup name `first_found`, which is still valid. Official documentation recommends `ansible.builtin.first_found` for clear linking and avoiding name conflicts, but this is a recommendation rather than a correctness issue.
- `ansible-doc` is not installed in the local environment, so validation was performed against current official online Ansible documentation.
