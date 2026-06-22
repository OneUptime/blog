# Validation Summary: How to Handle Ansible Roles Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible roles
- Ansible role dependencies
- Ansible Galaxy
- Ansible collections
- YAML configuration
- `ansible.builtin.include_role`

## Sources Consulted
- Ansible Community Documentation: Roles - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible Community Documentation: Galaxy User Guide - https://docs.ansible.com/projects/ansible/latest/galaxy/user_guide.html
- Ansible Community Documentation: `ansible.builtin.include_role` module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible Community Documentation: Collection Galaxy metadata structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html

## Issues Found
- The post stated that dependencies run only once per play by default. This was incomplete because Ansible re-runs duplicate role dependencies when role parameters, tags, or `when` clauses differ, or when `allow_duplicates: true` is set on the dependent role. Updated the wording to include that caveat.
- The `allow_duplicates` example passed different per-run values through `vars`. Official Ansible documentation warns that `vars:` has play-level scoping effects and is not the same as passing role parameters for deduplication behavior. Changed the example to pass `log_path` as a role parameter.
- The version-conflict example used a semantic version range for a standalone Galaxy role. Official Ansible Galaxy documentation notes that version ranges are not supported for roles, although they are supported for collection requirements. Changed the example to pin an exact role version.

## Review Notes
The remaining examples align with official Ansible documentation. The local environment did not have `ansible-galaxy` installed, so CLI syntax was verified against the official Ansible documentation rather than local `--help` output.
