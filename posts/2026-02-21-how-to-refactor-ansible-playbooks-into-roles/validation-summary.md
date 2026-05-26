# Validation Summary: How to Refactor Ansible Playbooks into Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible roles
- ansible-galaxy CLI
- Ansible built-in modules: apt, user, template, file, git, pip, get_url, unarchive, copy, systemd/systemd_service, assert
- community.general timezone module
- Prometheus node_exporter
- systemd services

## Sources Consulted
- Ansible roles documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_reuse_roles.html
- Ansible handlers documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- ansible-galaxy CLI documentation: https://docs.ansible.com/ansible/latest/cli/ansible-galaxy.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible template module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible file module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible timezone module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/timezone_module.html
- Prometheus node_exporter releases: https://github.com/prometheus/node_exporter/releases

## Issues Found
- The defaults guidance said defaults should work without overrides for the most common case, but the `app_deploy` example intentionally leaves `app_repo` empty because it is project-specific. Updated the guidance so it distinguishes sensible defaults from values that should be overridden by the playbook.
- The playbook examples used `timezone`/`ansible.builtin.timezone`, but current Ansible documentation provides the timezone module as `community.general.timezone`. Updated both examples to use the correct fully qualified collection name.
- The post stated that role handlers are scoped differently than playbook handlers. Ansible documentation states that handlers from roles are inserted into the play's global handler scope, and role-qualified handler names can be used to disambiguate. Updated the pitfall note to explain that behavior accurately.

## Review Notes
- The local environment did not have Ansible installed, so module and CLI behavior was checked against current official Ansible documentation rather than local `ansible-doc` or `ansible-galaxy --help` output.
- The examples use legacy boolean values such as `yes`, which are still accepted by Ansible/YAML, while the later examples use fully qualified collection names where applicable.
