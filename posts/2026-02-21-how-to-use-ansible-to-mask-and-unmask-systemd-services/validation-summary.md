# Validation Summary: How to Use Ansible to Mask and Unmask systemd Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.systemd / ansible.builtin.systemd_service
- ansible.builtin.service_facts
- systemd
- systemctl
- Linux service management

## Sources Consulted
- Ansible Community Documentation: ansible.builtin.systemd_service module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible Community Documentation: ansible.builtin.systemd alias redirect - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html
- Ansible Community Documentation: ansible.builtin.service_facts module - https://docs.ansible.com/ansible/latest/collections/ansible/builtin/service_facts_module.html
- systemd systemctl manual - https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Local systemctl help output from systemd 255

## Issues Found
- The post stated that Ansible stops the service first, then disables it, then masks it when `state`, `enabled`, and `masked` are set together. Current Ansible documentation states that the `systemd_service` module applies enable/disable changes first, then mask/unmask changes, then handles the service state. Updated the sentence to match the documented order.

## Review Notes
- `ansible.builtin.systemd` is still valid as a backward-compatible alias, but the current Ansible documentation recommends `ansible.builtin.systemd_service` as the clearer module name. The post's examples remain technically correct.
- Runtime masking with `systemctl mask --runtime` and persistent masking locations under `/run/systemd/system/` and `/etc/systemd/system/` match the systemd manual.
