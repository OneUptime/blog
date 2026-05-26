# Validation Summary: How to Share Ansible Roles Across Multiple Projects

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible roles
- Ansible Galaxy CLI
- Ansible collections
- Ansible configuration (`ansible.cfg`)
- Git repositories and submodules
- GitHub Actions and GitLab CI

## Sources Consulted
- Ansible Galaxy user guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible collection guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/index.html
- Ansible collection creation guide: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_creating.html
- Ansible collection metadata reference: https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Git submodule documentation: https://git-scm.com/docs/git-submodule
- Git clone documentation: https://git-scm.com/docs/git-clone

## Issues Found
- The role scaffolding command used the older `ansible-galaxy init` form. Updated it to `ansible-galaxy role init . --force`, matching the current explicit role subcommand.
- The role installation examples used `ansible-galaxy install`. Updated them to `ansible-galaxy role install` in the project setup, install script, GitLab CI, and GitHub Actions examples.
- The private Automation Hub section described hosting standalone roles and used a role requirement with `src` set to the hub root URL. Updated the section to describe hosting collections that contain roles, and changed the requirements example to a `collections:` entry, which matches current Automation Hub and `server_list` behavior.

## Review Notes
- `ansible-galaxy` was not installed in the local environment, so CLI validation was performed against the current official Ansible documentation instead of local `--help` output.
- The Git submodule commands and `roles_path` examples are technically valid.
