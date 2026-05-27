# Validation Summary: How to Structure Ansible Plugins in Collections

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible collections
- Ansible plugins
- Ansible Galaxy
- `galaxy.yml`
- `ansible-galaxy`
- `ansible-test`
- Python module utilities
- YAML playbooks and requirements files

## Sources Consulted
- Ansible Community Documentation: Collection structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_structure.html
- Ansible Community Documentation: Collection Galaxy metadata structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible Core Documentation: Collection `module_utils` imports and plugin notes - https://docs.ansible.com/projects/ansible-core/2.19/dev_guide/developing_collections_structure.html
- Ansible Core Documentation: Testing collections - https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_collections_testing.html
- Ansible Community Documentation: Running integration tests - https://docs.ansible.com/projects/ansible/latest/community/collection_contributors/collection_integration_running.html
- Ansible Community Documentation: Filter plugins - https://docs.ansible.com/projects/ansible/latest/plugins/filter.html
- Ansible Documentation: Using collections in playbooks - https://docs.ansible.com/projects/ansible/2.9/user_guide/collections_using.html
- Ansible Core Documentation: Installing collections - https://docs.ansible.com/projects/ansible-core/devel/collections_guide/collections_installing.html

## Issues Found
- The post said the `collections` keyword can avoid repeating the FQCN generally. Ansible documentation says the keyword shortens module and action plugin names, but non-action plugins such as lookups, filters, and tests still require FQCNs. Updated the sentence to make that limitation explicit.
- The post recommended running collection unit tests directly with `pytest`. Ansible's collection testing documentation identifies `ansible-test` as the main collection testing tool and uses `ansible-test units --docker default -v` for unit tests. Updated the command accordingly.

## Review Notes
The `galaxy.yml` example uses `build_ignore` entries such as `.git` and `tests/output`, which Ansible already filters by default. This is redundant but technically valid, so it was left unchanged.
