# Validation Summary: How to Use the Ansible systemd_service Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.systemd_service
- ansible.builtin.service_facts
- systemd service units
- systemd timer units
- Linux service management

## Sources Consulted
- Ansible documentation: ansible.builtin.systemd_service module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible documentation: ansible.builtin.service_facts module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- systemd.service official manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.unit official manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.timer official manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemd.exec official manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd.resource-control official manual - https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html

## Issues Found
- The custom service example placed `StartLimitIntervalSec` and `StartLimitBurst` in the `[Service]` section. Current systemd documentation defines these as unit start rate limiting options in the `[Unit]` section. Moved both directives to `[Unit]`.
- The "Gathering Service Facts" section said the `systemd_service` module can gather service facts, but the example correctly uses `ansible.builtin.service_facts`. Updated the explanatory sentence to identify `service_facts` as the fact-gathering module.

## Review Notes
The `ansible.builtin.systemd` name is still retained as a backward-compatible alias, while `ansible.builtin.systemd_service` is the documented FQCN. User-scoped systemd services can require a user bus and a valid `XDG_RUNTIME_DIR`, as noted by the Ansible documentation.
