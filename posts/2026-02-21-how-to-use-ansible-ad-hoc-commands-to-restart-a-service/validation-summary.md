# Validation Summary: How to Use Ansible Ad Hoc Commands to Restart a Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible ad hoc commands
- ansible.builtin.service module
- ansible.builtin.systemd_service module
- Ansible asynchronous ad hoc execution
- systemd and systemctl
- Linux service verification commands
- nginx, Apache, HAProxy, PostgreSQL, sshd

## Sources Consulted
- Ansible ad hoc command documentation: https://docs.ansible.com/ansible/latest/command_guide/intro_adhoc.html
- Ansible service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible asynchronous actions and polling documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_async.html
- Ansible command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- systemd.service TimeoutStartSec documentation: https://www.freedesktop.org/software/systemd/man/249/systemd.service.html
- systemd-run documentation: https://www.freedesktop.org/software/systemd/man/247/systemd-run.html

## Issues Found
- The post referred to the `systemd` module. Updated the section to use the current `ansible.builtin.systemd_service` module name from the official Ansible documentation.
- The failed-restart debugging example claimed to start nginx in the foreground but used `&`, which backgrounds the process. Changed it to run nginx in the foreground briefly with `timeout`.
- The timeout example used `-e "ansible_command_timeout=120"` for a normal shell-based service restart and described it as systemd `TimeoutStartSec`. Replaced it with Ansible ad hoc async polling using `-B 120 -P 5`, which is the documented ad hoc mechanism for long-running operations.
- The summary implied that `-f 1` alone provides zero downtime. Clarified that zero-downtime restarts also depend on load balancing and health checks.

## Review Notes
The remaining commands are generally valid examples for Linux hosts with the referenced services and utilities installed. Several examples use the `shell` module appropriately because they rely on pipes, redirects, command chaining, or shell quoting. For larger production workflows, a playbook with `serial`, handlers, health checks, and load-balancer drain/undrain steps would be more maintainable than ad hoc commands.
