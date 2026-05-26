# Validation Summary: How to Lock Ansible Role Versions in requirements.yml

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
- CI/CD dependency installation

## Sources Consulted
- Ansible Galaxy User Guide: https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Installing Collections Guide: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible ansible-galaxy CLI Reference: https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The post implied role `version` fields could use version ranges in the lock-file pattern. Official Ansible documentation notes that ranges are not supported for roles, so the example was changed to use exact role versions and to state that Ansible does not generate a role lock file automatically.
- The lock-file example used `src: https://galaxy.ansible.com` for Galaxy roles. Role requirements use role names such as `geerlingguy.docker`; `source` is a collection requirement key, so the incorrect `src` entries were removed.
- The CI lock-file command used the generic `ansible-galaxy install` form for a role-only lock file. It was changed to `ansible-galaxy role install` for clarity and consistency with current CLI documentation.
- The collection range comment said `>=3.0.0,<4.0.0` installed any 2.x version. It was corrected to say 3.x.

## Review Notes
The local environment did not have `ansible-galaxy` installed, so CLI behavior was validated against official Ansible documentation rather than local `--help` output. The remaining examples are consistent with documented requirements file syntax and current Ansible Galaxy role/collection installation behavior.
