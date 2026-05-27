# Validation Summary: How to Use the Ansible systemd_service Module with daemon_reload

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible
- ansible.builtin.systemd_service
- systemd
- systemctl
- systemd unit files and drop-in overrides
- YAML
- Jinja2 templates

## Sources Consulted
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible handler documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- systemctl manual: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd.unit manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemd.resource-control manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
- Local `systemctl --help` output for command availability and option names.

## Issues Found
- The complete deployment example copied binaries into `/opt/services/{{ item.name }}/bin`, used `/opt/services/{{ item.name }}` as `WorkingDirectory`, and allowed writes to `/var/log/services/{{ item.name }}`, but did not create those directories. Added tasks to create the service binary and log directories with appropriate ownership before copying binaries and starting services.

## Review Notes
The main `daemon_reload` guidance is accurate: Ansible runs `daemon-reload` before other `systemd_service` operations when `daemon_reload: true` is set, and current Ansible supports running it without a unit name. Handler ordering guidance is also consistent with Ansible's documented handler insertion/execution behavior. The unit-file directives used in the examples are valid systemd directives, though availability can still vary on older distribution systemd versions.
