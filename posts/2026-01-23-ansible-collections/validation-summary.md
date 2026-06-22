# Validation Summary: How to Use Ansible Collections

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Collections
- ansible-galaxy CLI
- Ansible Galaxy requirements files
- ansible.cfg collection and Galaxy server configuration
- Ansible playbooks and roles
- Custom Ansible modules and filter plugins
- Collection build, publish, and test workflows

## Sources Consulted
- Ansible Community Documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Using collections in a playbook - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- Ansible Community Documentation: Ansible Configuration Settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: Collection Galaxy metadata structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible Community Documentation: Collection structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_structure.html
- Ansible Community Documentation: Creating collections - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_creating.html
- Ansible Community Documentation: ansible-galaxy CLI - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The ansible.cfg snippet showed `collections = community.general` as a default collection setting. Ansible documents `collections` as a play/role keyword, not an ansible.cfg default collection setting, so the snippet now tells readers to use FQCNs or the play/role-level `collections` keyword.
- The Galaxy server URLs in the server list omitted trailing slashes. Official Ansible docs state that each configured Galaxy server `url` must end with `/`, so both example URLs now include trailing slashes.
- The private publish command used `--server private_galaxy` together with `--api-key` even though `private_galaxy` is defined in `server_list` with a token. Official docs say `--api-key` cannot be used for predefined servers in the server list, so the command now relies on the configured token.

## Review Notes
- The installed environment did not include `ansible-galaxy` or `ansible-config`, so CLI behavior was verified against official Ansible documentation rather than local command output.
- Git-based collection installation is technically supported but the Ansible docs describe it as a developer shortcut; hosted Galaxy or Automation Hub artifacts are preferable for production dependency distribution.
