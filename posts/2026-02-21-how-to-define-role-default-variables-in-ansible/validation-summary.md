# Validation Summary: How to Define Role Default Variables in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible role defaults and variables
- YAML
- Jinja2 templates
- Ansible built-in modules (`user`, `group`, `file`, `get_url`, `include_tasks`)

## Sources Consulted
- Ansible Community Documentation: Roles, role directory structure, role defaults, and role variable files: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Using variables and variable precedence: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible Core Documentation: General precedence rules and `-e` extra variables: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/general_precedence.html
- Ansible Community Documentation: `ansible.builtin.user` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible Community Documentation: `ansible.builtin.group` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html

## Issues Found
- The user creation example assigned `myapp_group` as the user's primary group without first creating that group. I added an `ansible.builtin.group` task before the `ansible.builtin.user` task so the example can work on a host where the group does not already exist.
- The override section said the examples were listed from lowest to highest precedence. That is not accurate for role parameters versus inventory `group_vars` and `host_vars`, so I changed the wording to describe them as common override methods instead of a strict precedence list.
- The split-defaults section said `defaults/main/` is available since Ansible 2.11 and that Ansible "merges" all files automatically. Current official documentation describes `defaults` and `vars` as able to match a directory and says Ansible processes variable files in alphabetical order, so I removed the unsupported version-specific wording and changed "merges" to "processes".
- The task example used `system: yes`. While Ansible accepts YAML booleans, current Ansible guidance prefers `true`/`false` for boolean values, so I changed it to `system: true`.

## Review Notes
The examples use `https://releases.example.com/...`, which is appropriate as a placeholder URL. The post correctly states that role defaults have very low precedence and are overridden by inventory variables and extra vars. For future improvement, the post could mention that duplicate variables loaded from multiple default files follow Ansible's normal variable replacement behavior rather than a deep dictionary merge unless configuration changes that behavior.
