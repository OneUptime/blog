# Validation Summary: How to Use ansible-galaxy list to View Installed Roles

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Ansible Galaxy CLI
- Ansible roles
- Ansible collections
- ansible.cfg configuration
- Bash
- Python
- GitHub Actions

## Sources Consulted
- Ansible Community Documentation: ansible-galaxy CLI reference, https://docs.ansible.com/projects/ansible/latest/cli/ansible-galaxy.html
- Ansible Community Documentation: Listing collections, https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_listing.html
- Ansible Core Documentation: Configuration settings, https://docs.ansible.com/projects/ansible-core/2.18/reference_appendices/config.html
- Local verification with ansible-core 2.21.0 CLI help for `ansible-galaxy role list`, `ansible-galaxy collection list`, and `ansible-config dump`.

## Issues Found
- The post used `ansible-galaxy list` throughout as the primary role-listing command. Current Ansible documentation presents the explicit role subcommand as `ansible-galaxy role list`, while local ansible-core 2.21.0 still accepts `ansible-galaxy list` as shorthand. Updated role-listing commands and explanations to use `ansible-galaxy role list` while noting the shorthand.
- The collection filtering section claimed `ansible-galaxy collection list community.general` returns an error when the collection is not installed. In ansible-core 2.21.0, the command exits successfully with no matching output. Updated the explanation and changed the shell snippet to inspect the command output with `grep` instead of relying on exit status alone.

## Review Notes
The collection path examples use `COLLECTIONS_PATHS`, which still appears in `ansible-config dump` and the CLI help text. Ansible documentation notes that the plural INI setting `collections_paths` and environment variable `ANSIBLE_COLLECTIONS_PATHS` are deprecated in favor of singular forms, so future posts that show collection path configuration should prefer `collections_path` and `ANSIBLE_COLLECTIONS_PATH`.
