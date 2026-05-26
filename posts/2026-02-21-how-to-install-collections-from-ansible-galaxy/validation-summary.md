# Validation Summary: How to Install Collections from Ansible Galaxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- Ansible Galaxy
- Ansible collections
- ansible-galaxy CLI
- Ansible requirements.yml files
- ansible.cfg collection paths

## Sources Consulted
- Ansible Community Documentation: Installing collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible Community Documentation: Downloading collections - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_downloading.html
- Ansible Community Documentation: ansible-galaxy CLI reference - https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Ansible configuration settings, COLLECTIONS_PATHS - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: Using collections in a playbook - https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_using_playbooks.html
- Ansible Community Documentation: community.postgresql.postgresql_db module - https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- Ansible Community Documentation: community.postgresql.postgresql_user module - https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_user_module.html

## Issues Found
- The offline installation example installed from `requirements.yml` without making clear that it must use the generated offline requirements file created by `ansible-galaxy collection download`. Updated the example to change into the download directory and install from that generated file with `--offline`.
- The dependency inspection example suggested `ansible-galaxy collection verify` as a way to check dependency metadata. The official CLI documentation describes `verify` as an integrity and checksum verification command and notes that it does not verify dependencies. Removed that command and kept the installed `MANIFEST.json` inspection example.
- The text described `--force` as a force upgrade, but the command performs a force reinstall. Updated the wording to match the flag behavior.

## Review Notes
- The local environment does not have `ansible-galaxy` installed, so CLI behavior was verified against the current official Ansible documentation rather than local `--help` output.
- The `collections_path` setting shown in the post uses the current singular INI key. Older plural forms are deprecated in current Ansible documentation.
