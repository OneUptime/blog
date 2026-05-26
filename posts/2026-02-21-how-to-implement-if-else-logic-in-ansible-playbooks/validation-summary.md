# Validation Summary: How to Implement If/Else Logic in Ansible Playbooks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- Ansible conditionals with `when`
- Ansible blocks, `rescue`, and `always`
- Ansible built-in modules including `apt`, `dnf`, `set_fact`, `template`, `include_tasks`, `copy`, `fail`, and `systemd`
- `community.docker` Ansible collection modules
- Jinja2 template conditionals and inline expressions

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible `ternary` filter documentation: https://docs.ansible.com/projects/ansible-core/2.14/collections/ansible/builtin/ternary_filter.html
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `yum` redirect documentation: https://docs.ansible.com/projects/ansible-core/2.17/collections/ansible/builtin/yum_module.html
- Ansible `template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible facts documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- `community.docker.docker_image` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_module.html
- `community.docker.docker_image_info` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/docker/docker_image_info_module.html
- Jinja template documentation: https://jinja.palletsprojects.com/en/stable/templates/

## Issues Found
- The first package installation example used `ansible.builtin.yum` for RedHat-family systems. Current Ansible documentation redirects `ansible.builtin.yum` to `ansible.builtin.dnf`, so the example was updated to use `ansible.builtin.dnf`.
- The block/rescue explanation said `rescue` and `always` handled any task failure unconditionally. Official Ansible documentation notes that invalid task definitions and unreachable hosts do not trigger this error-handling behavior, so the explanation was made more precise.
- The section "Using select with If/Else Logic" did not use the Jinja2 `select` filter. The heading and lead-in sentence were corrected to describe list expressions instead.

## Review Notes
The examples assume gathered facts are available as top-level `ansible_` variables, which is Ansible's default behavior unless fact injection is disabled. The `community.docker.docker_image` module remains usable, but the current community.docker documentation recommends more specific image modules for new playbooks.
