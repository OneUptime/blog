# Validation Summary: How to Debug Ansible Module Not Found Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Ansible
- Ansible collections
- ansible-galaxy
- ansible-doc
- ansible.cfg
- Custom Ansible modules
- Python interpreter discovery for Ansible managed hosts
- community.postgresql and community.docker collections

## Sources Consulted
- Ansible collections installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- Ansible collections listing documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_listing.html
- Ansible configuration settings: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible interpreter discovery documentation: https://docs.ansible.com/ansible/latest/reference_appendices/interpreter_discovery.html
- Ansible local modules documentation: https://docs.ansible.com/ansible/latest/plugins/module.html
- Ansible 2.10 porting guide: https://docs.ansible.com/projects/ansible/latest/porting_guides/porting_guide_2.10.html
- ansible-doc CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-doc.html
- ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- community.postgresql.postgresql_db module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html
- community.docker.docker_container module documentation: https://docs.ansible.com/ansible/latest/collections/community/docker/docker_container_module.html

## Issues Found
- The PostgreSQL dependency example said the `community.postgresql` modules require `psycopg2` specifically. Current `community.postgresql.postgresql_db` documentation says the module can use `psycopg2 >= 2.5.1` or `psycopg3 >= 3.1.8`. Updated the wording to say `psycopg` and clarify that either psycopg2 or psycopg3 must be installed.

## Review Notes
- The `ansible-galaxy collection install -p ./collections` examples are technically valid, but Ansible installs under an `ansible_collections` subdirectory below the specified path. The existing `collections_path = ./collections` configuration accounts for that layout.
- Ansible's current configuration documentation uses `collections_path` as the active `ansible.cfg` key. Older plural forms still appear in some output and compatibility documentation, but the post uses the current singular key in configuration snippets.
