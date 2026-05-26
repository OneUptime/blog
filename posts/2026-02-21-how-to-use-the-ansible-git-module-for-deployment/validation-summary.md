# Validation Summary: How to Use the Ansible git Module for Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- ansible.builtin.git
- ansible.builtin.pip
- ansible.builtin.systemd / ansible.builtin.systemd_service
- ansible.builtin.uri
- ansible.builtin.apt
- ansible.builtin.file
- Ansible rolling deployments with serial
- Ansible block/rescue error handling
- Git-based application deployment
- Slack webhook notifications

## Sources Consulted
- Ansible ansible.builtin.git module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible retry/until playbook documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_loops.html#retrying-a-task-until-a-condition-is-met
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Ansible ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.systemd redirect documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible blocks and rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible error handling and max_fail_percentage documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html

## Issues Found
- The database migration and static collection examples used `source venv/bin/activate` inside `ansible.builtin.shell`. The shell module runs commands through `/bin/sh` by default, where `source` is not portable. Changed those commands to call `./venv/bin/python` directly.
- The health check tasks used `retries` and `delay` without an explicit `until` condition. Current Ansible supports retrying without `until`, but adding `until: health_check.status == 200` makes the examples correct for a wider range of Ansible versions and matches documented retry patterns.
- The notification example comment claimed failure notifications were included, but the playbook only sends start and completion notifications. Updated the comment to match the code.

## Review Notes
- `ansible.builtin.systemd` is still supported as an alias/redirect to `ansible.builtin.systemd_service`, so the examples are technically valid.
- The examples use placeholder repository URLs, service names, load balancer endpoints, and Slack webhook configuration, which is appropriate for an instructional post.
