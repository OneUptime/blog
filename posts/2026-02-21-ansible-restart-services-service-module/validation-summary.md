# Validation Summary: How to Restart Services with the Ansible service Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.service
- Ansible handlers and meta: flush_handlers
- ansible.builtin.uri
- ansible.builtin.wait_for
- Ansible rolling updates with serial and max_fail_percentage
- systemd and systemd-run
- Nginx and PostgreSQL service examples

## Sources Consulted
- Ansible ansible.builtin.service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible error handling documentation for max_fail_percentage: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_error_handling.html
- Ansible delegation and rolling updates documentation: https://docs.ansible.com/projects/ansible/2.9/user_guide/playbooks_delegation.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.wait_for module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/wait_for_module.html
- systemd-run help output from the local systemd installation
- systemd-run manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-run.html

## Issues Found
- The post claimed that systemd will typically fall back to a restart when `state: reloaded` is used on a service that does not support reload. This is inaccurate for systemd units without reload support, where reload typically fails rather than automatically restarting. Updated the text to describe that behavior correctly.
- The delayed restart example created `/etc/systemd/system/restart-myapp.service` but then scheduled a separate transient `systemd-run` command that did not use that unit file. Removed the unused unit creation task so the example matches what it actually does.

## Review Notes
The remaining examples are technically valid Ansible patterns. In production, the pre-check example could be made safer by using the `validate` option on `ansible.builtin.template` for services such as nginx, but the existing example still correctly validates before restarting.
