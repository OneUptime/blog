# Validation Summary: How to Use Ansible Roles with Multiple Playbooks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks
- Ansible roles
- Ansible role dependencies
- Ansible configuration with `ansible.cfg`
- `ansible.builtin.include_role`
- `ansible.builtin.apt`
- `community.general.timezone`
- `ansible.builtin.hostname`
- Ansible Galaxy roles

## Sources Consulted
- Ansible Community Documentation: Roles, including role search paths, play-level roles, inline role variables, and role dependencies: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Search paths in Ansible, including configuration-relative paths: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbook_pathing.html
- Ansible Community Documentation: `ansible.builtin.include_role` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible Community Documentation: `ansible.builtin.apt` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible Community Documentation: `community.general.timezone` module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible Community Documentation: `ansible.builtin.hostname` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html

## Issues Found
- The timezone task used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone`, which is not included in `ansible-core`. Changed the task to use `community.general.timezone`.
- The text implied that a project-root `ansible.cfg` is automatically effective regardless of invocation context. Ansible loads `ansible.cfg` from defined configuration search locations, and relative configuration paths are generally resolved relative to the loaded config file. Updated the sentence to clarify that the command should be run from the project root or Ansible should otherwise be pointed at that config file.
- The heading "External Role Collections" could be confused with Ansible Collections, which are not configured with `roles_path`. Renamed it to "External Role Directories" while keeping the existing discussion about standalone role directories.

## Review Notes
The remaining role examples align with current Ansible role search behavior, play-level role syntax, `include_role` conditional and loop usage, and `meta/main.yml` role dependency syntax. The post does not pin an Ansible version; readers using `community.general.timezone` need the `community.general` collection available, which is included with the full `ansible` package but not with `ansible-core`.
