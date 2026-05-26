# Validation Summary: How to Use ansible-galaxy init to Create Role Scaffolding

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Galaxy CLI
- Ansible roles
- Ansible configuration
- Jinja2 skeleton templates
- YAML

## Sources Consulted
- Ansible Community Documentation: ansible-galaxy CLI, https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Galaxy Developer Guide, Creating roles for Galaxy, https://docs.ansible.com/projects/ansible/latest/galaxy/dev_guide.html
- Ansible Community Documentation: Configuration Settings, GALAXY_ROLE_SKELETON and GALAXY_ROLE_SKELETON_IGNORE, https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html

## Issues Found
- Current Ansible documentation uses `ansible-galaxy role init` for role scaffolding rather than the older top-level `ansible-galaxy init` form. Updated the title, description, prose, and command examples to use `ansible-galaxy role init`.
- The custom skeleton section said skeleton files support Jinja2 templating directly and showed templating in `main.yml` files. Official documentation says `.j2` files outside a `templates/` directory are rendered as templates. Updated the examples to use `tasks/main.yml.j2` and `meta/main.yml.j2`.
- The custom skeleton section referenced `template_date` as a built-in variable. Official documentation identifies `role_name` as the useful built-in variable for role skeleton templates. Removed `template_date` from the example.
- The `role_skeleton_ignore` example used YAML-style list syntax in `ansible.cfg`. Official documentation defines it as an Ansible list setting and shows comma-separated regex patterns in INI. Updated the example to `role_skeleton_ignore = ^.git$,^.github$,^__pycache__$`.

## Review Notes
The local environment did not have `ansible` or `ansible-galaxy` installed, so CLI behavior was verified against current official Ansible documentation instead of local `--help` output.
