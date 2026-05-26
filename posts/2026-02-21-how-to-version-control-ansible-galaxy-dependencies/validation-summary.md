# Validation Summary: How to Version Control Ansible Galaxy Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible roles
- Ansible collections
- YAML requirements files
- ansible.cfg
- Git and Git submodules
- GitHub Actions
- Bash
- Python

## Sources Consulted
- Ansible Galaxy User Guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- ansible-galaxy CLI reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible configuration settings reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Galaxy v3 collection API endpoint tested with `community.general`: https://galaxy.ansible.com/api/v3/plugin/ansible/content/published/collections/index/community/general/

## Issues Found
- The lock-file script used `ansible-galaxy list`, which is ambiguous/outdated in current documentation. Changed it to `ansible-galaxy role list -p ./galaxy-roles` to match the documented role subcommand and the custom role install path used in the post.
- The lock-file script listed collections without the custom collection path. Changed it to `ansible-galaxy collection list -p ./collections --format yaml` so the generated lock file reflects the project-local collections installed by the examples.
- The CI install example used `ansible-galaxy install -r requirements.yml -p ./galaxy-roles/` for roles. Changed it to `ansible-galaxy role install -r requirements.yml -p ./galaxy-roles/`, which is the documented role-specific command and avoids ambiguity with mixed role/collection requirements.
- The Git submodule example said it was pinning to a specific commit while checking out `v3.1.0`, a tag. Updated the comment to say "specific tag."
- The post claimed `role_file` and `collection_file` could be set under `[galaxy]` in `ansible.cfg`. Those keys are not documented Ansible configuration settings. Replaced the snippet with explicit `ansible-galaxy role install -r requirements.yml` and `ansible-galaxy collection install -r requirements.yml` commands.

## Review Notes
- The local environment did not have `ansible-galaxy` installed, so CLI behavior was verified against official Ansible documentation instead of local `--help` output.
- The Galaxy update-check API URL used in the post was tested successfully against `community.general` and returned a `highest_version` field.
- The post recommends exact version pins for production reproducibility. Ansible documentation supports collection version range syntax, while noting role ranges are not supported; the post's exact-pin recommendation is a valid operational best practice.
