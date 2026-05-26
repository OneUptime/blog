# Validation Summary: How to Delete Files and Directories with the Ansible file Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.file module
- ansible.builtin.find module
- ansible.builtin.stat module
- ansible.builtin.uri module
- ansible.builtin.systemd_service module
- ansible.builtin.user module
- ansible.builtin.group module
- YAML playbook syntax
- Jinja filters in Ansible

## Sources Consulted
- Ansible ansible.builtin.file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible ansible.builtin.stat module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible ansible.builtin.group module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible ansible.builtin.sort filter documentation: https://docs.ansible.com/projects/ansible-core/2.20/collections/ansible/builtin/sort_filter.html

## Issues Found
- The "Deleting Contents but Keeping the Directory" section said to add another step "if you also need to remove subdirectories" after an example that already used `file_type: any`, which includes directories. Changed the wording to describe the second example as an explicit directory-handling variant.
- The explicit directory-handling example did not include `hidden: true` when finding directories, so hidden subdirectories could be left behind. Added `hidden: true` to match the cleanup intent.
- The role example used `ansible.builtin.systemd`. The current official documentation redirects this to `ansible.builtin.systemd_service` and recommends the `systemd_service` FQCN, so the example was updated.

## Review Notes
The core `ansible.builtin.file` behavior described in the post is correct: `state: absent` recursively deletes directories, unlinks files and symlinks, and does not fail when the path is already absent. The `find` examples use documented parameters such as `patterns`, `age`, `recurse`, `file_type`, and `hidden`.
