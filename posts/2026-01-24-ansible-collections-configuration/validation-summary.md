# Validation Summary: How to Configure Ansible Collections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Collections
- Ansible Galaxy CLI
- Ansible Galaxy requirements files
- ansible.cfg configuration
- Ansible playbooks and roles
- Python custom Ansible modules
- Red Hat Automation Hub

## Sources Consulted
- Ansible Community Documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: ansible-galaxy CLI reference - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Configuration settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: Using collections in a playbook - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- Ansible Community Documentation: Collection structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_structure.html
- Ansible Community Documentation: Collection Galaxy metadata structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible Lint Documentation: FQCN rule - https://docs.ansible.com/projects/lint/rules/fqcn/

## Issues Found
- The `ansible.cfg` examples used `collections_paths`, but the current documented `[defaults]` key is `collections_path`. Updated both configuration snippets.
- The role path comment implied `roles_path` is needed for roles inside collections. Collection roles are resolved by their FQCN from collection paths, so the comment now refers to standalone project roles.
- The custom module documented and accepted a `validate` option, but the implementation never used it to validate configuration. Removed the option and the related documentation/example line so the module matches its behavior.
- The publish example implied that `ANSIBLE_GALAXY_TOKEN` is automatically consumed by `ansible-galaxy collection publish`. Updated the command to pass the shell variable explicitly with `--token`.
- The offline download examples used `-d`; the documented `ansible-galaxy collection download` option is `-p` / `--download-path`. Updated both commands.
- The offline requirements example used `source` for local tarballs. The documented format uses `name` with `type: file`. Updated both entries.
- The version constraints section used `~=` as a compatible-version operator, but Ansible's documented collection range identifiers do not include it. Replaced the example with an explicit `>=5.0.0,<6.0.0` range.
- The upgrade examples used `--force` / `--force-with-deps` as upgrade commands. Updated them to the documented `--upgrade` flag.
- The "check for available updates" comment described a command that only prints installed versions. Reworded the comment to reflect the command's actual behavior.

## Review Notes
The local environment did not have `ansible` or `ansible-galaxy` installed, so CLI verification was performed against the official Ansible CLI documentation rather than local `--help` output.
