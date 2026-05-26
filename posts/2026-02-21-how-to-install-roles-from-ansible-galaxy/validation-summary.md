# Validation Summary: How to Install Roles from Ansible Galaxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible roles
- YAML requirements files
- Ansible playbooks
- Git-based role sources

## Sources Consulted
- Ansible Community Documentation: Galaxy User Guide, installing roles from Galaxy, versioned roles, requirements files, dependencies, and role listing: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Community Documentation: `ansible-galaxy` CLI reference for role install/list/info/search options including `--roles-path`, `--role-file`, `--force`, `--no-deps`, `--timeout`, and `--ignore-certs`: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The post said role version ranges can be used. Current Ansible documentation states that ranges are not supported for roles, so I changed this to say Galaxy roles should be pinned to exact imported versions.
- The custom path section said project-local roles are kept "in version control," but the later production workflow correctly recommends ignoring downloaded roles. I changed the wording to say the roles are kept in the project directory.
- The troubleshooting section suggested `--force` as a solution for conflicting role versions. `--force` overwrites an installed role but does not allow two versions of the same role name to coexist, so I clarified that the practical fix is to use a single version.
- The production workflow suggested checking updates with `ansible-galaxy search`. The CLI's `search` command searches for roles, while `role info` or the Galaxy role page is more appropriate for checking role details before upgrades. I updated that recommendation.

## Review Notes
The `ansible-galaxy install` examples are still accepted in Ansible documentation, though current docs often show the more explicit `ansible-galaxy role install` form for role operations. Future revisions could standardize on the explicit subcommand for clarity.
