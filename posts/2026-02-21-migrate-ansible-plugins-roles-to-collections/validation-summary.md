# Validation Summary: How to Migrate Plugins from Roles to Collections

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ansible collections
- Ansible plugins
- Ansible Galaxy CLI
- ansible-test
- Python
- YAML
- ansible.cfg

## Sources Consulted
- Ansible collection structure documentation: https://docs.ansible.com/projects/ansible-core/2.19/dev_guide/developing_collections_structure.html
- Ansible collection testing documentation: https://docs.ansible.com/projects/ansible/latest/dev_guide/developing_collections_testing.html
- Ansible collection unit testing documentation: https://docs.ansible.com/projects/ansible/latest/community/collection_contributors/collection_unit_tests.html
- Ansible filter plugin documentation: https://docs.ansible.com/projects/ansible/latest/plugins/filter.html
- Ansible lookup documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_lookups.html
- Ansible configuration settings for COLLECTIONS_PATHS: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html#collections-paths
- ansible-galaxy CLI documentation for collection init: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html

## Issues Found
- The collection initialization flow created `myorg/myutils` outside an `ansible_collections` path, but Ansible's collection testing documentation says `ansible-test` should be run from a collection directory whose path includes `ansible_collections`. Updated the command to use `ansible-galaxy collection init --init-path collections/ansible_collections myorg.myutils` and adjusted related `cd` and `cp` examples.
- The import-scanning helper would flag `ansible.module_utils.six` as a custom module utility import even though official Ansible collection structure examples still show it as an Ansible-provided module utility import. Added it to the exclusion list.
- The unit test example imported the filter with `from plugins.filter.my_filters import FilterModule`, which does not match Ansible's documented collection import pattern. Updated it to import via `ansible_collections.myorg.myutils.plugins.filter.my_filters`.
- The test command used direct `pytest` for collection unit tests. Updated it to `ansible-test units --docker default -v`, matching Ansible's collection testing guidance.

## Review Notes
The remaining examples are technically consistent with current Ansible documentation. The post uses `collections_path` in `ansible.cfg`, which is still the documented INI key for the `COLLECTIONS_PATHS` setting, and the configured directory must contain collections under an `ansible_collections/<namespace>/<collection>` subtree.
