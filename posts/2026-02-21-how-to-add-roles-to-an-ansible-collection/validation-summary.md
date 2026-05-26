# Validation Summary: How to Add Roles to an Ansible Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible collections
- Ansible roles
- Ansible Galaxy collection metadata
- Ansible role dependencies
- Ansible handlers
- ansible-test integration testing
- Nginx reverse proxy configuration

## Sources Consulted
- Ansible Core documentation: Collection structure - https://docs.ansible.com/projects/ansible-core/devel/dev_guide/developing_collections_structure.html
- Ansible documentation: Collection Galaxy metadata structure - https://docs.ansible.com/projects/ansible/latest/dev_guide/collections_galaxy_meta.html
- Ansible Core documentation: Using collections in a playbook - https://docs.ansible.com/projects/ansible-core/devel/collections_guide/collections_using_playbooks.html
- Ansible documentation: Handlers: running operations on change - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible documentation: Integration tests - https://docs.ansible.com/projects/ansible/latest/dev_guide/testing_integration.html
- Ansible documentation: Roles - https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html

## Issues Found
- The role rendered `roles/nginx_proxy/templates/upstream.conf.j2`, but the post did not include that template. I added the missing upstream template so the example role is complete enough for the documented task list.
- The task examples notified `reload nginx` while the later guidance recommends prefixed handler names to avoid global handler-name collisions. I updated the example handler names and matching `notify` values to use `nginx_proxy | reload nginx` / `nginx_proxy | restart nginx`.
- The `ansible-test` command used `--docker` without naming an integration-test container image. I changed it to `ansible-test integration nginx_proxy --docker ubuntu`, matching the current official integration-test examples.

## Review Notes
- Official Ansible documentation confirms that collection roles live under `roles/`, that the role directory name is the collection role name, and that collection content including roles can be referenced by FQCN.
- Official Ansible documentation also notes that `role_name` metadata is ignored when Galaxy imports a collection; the post already states that the directory name becomes the role name.
