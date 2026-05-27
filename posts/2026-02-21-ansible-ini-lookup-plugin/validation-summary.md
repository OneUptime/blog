# Validation Summary: How to Use the Ansible ini Lookup Plugin

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible lookup plugins
- `ansible.builtin.ini`
- INI files
- Java-style properties files
- YAML playbooks
- Jinja2 templates

## Sources Consulted
- Ansible Core 2.19 documentation: `ansible.builtin.ini` lookup plugin: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/ini_lookup.html
- Ansible Core 2.19 documentation: Search paths in Ansible: https://docs.ansible.com/projects/ansible-core/2.19/playbook_guide/playbook_pathing.html
- Ansible `ini` lookup plugin source, stable 2.19: https://github.com/ansible/ansible/blob/stable-2.19/lib/ansible/plugins/lookup/ini.py

## Issues Found
- The post described `type='properties'` as a custom separator option. Updated the wording to clarify that it is for Java-style properties files without section headers.
- The post said relative paths are resolved relative to the playbook directory. Updated this to reflect Ansible's local task search path, which can include role and task-file directories before the playbook directory.
- The regex example used `lookup()` while describing multiple matches. Updated it to use `query()`, matching the official documentation's list-returning pattern.
- The regex section said it finds all matching keys, but the plugin returns values for matching keys. Updated the wording.
- The error-handling section implied `default` prevents failures for missing files and missing sections. Updated it to clarify that `default` only handles missing keys; missing files or sections still fail.

## Review Notes
- The short lookup name `ini` is still valid, but Ansible documentation recommends the fully qualified collection name `ansible.builtin.ini` for clearer documentation links and to avoid naming conflicts.
- `ansible` was not installed in the local environment, so examples were reviewed against official documentation and source code rather than executed locally.
