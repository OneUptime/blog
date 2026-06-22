# Validation Summary: How to Handle Ansible Handlers and Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible handlers and notifications
- Ansible roles
- Ansible modules: template, service, command, shell, meta, uri, stat, reboot, file, git, unarchive, wait_for
- YAML

## Sources Consulted
- Ansible handlers documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible error handling documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible playbook keywords reference: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- ansible.builtin.meta module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/meta_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible blocks documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_blocks.html

## Issues Found
- The handler failure section did not mention that a task failure later in the play prevents notified handlers from running on that failed host by default. Added a concise note and `force_handlers: true`, matching Ansible's documented forced-handler behavior.
- The fallback restart example used `ansible.builtin.command` with `&&`. The command module does not process shell metacharacters, so this would not run as intended. Changed it to `ansible.builtin.shell`.
- The reboot example notified a reboot handler after any package upgrade, but the handler name and comment said "if required." Added a `/var/run/reboot-required` stat check and made the handler conditional on that marker for Debian systems.
- The rolling restart health check used `retries` and `delay` without an explicit `until` condition. Added `register` and `until` so the retry behavior is clear and portable.

## Review Notes
The main handler behavior described in the post is accurate: handlers run only when notified by changed tasks, duplicate notifications coalesce to one handler run, handlers execute in handler-definition order, `listen` topics can notify multiple handlers, and `meta: flush_handlers` runs pending notified handlers at a chosen point.
