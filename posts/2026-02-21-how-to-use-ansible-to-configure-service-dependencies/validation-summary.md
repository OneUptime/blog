# Validation Summary: How to Use Ansible to Configure Service Dependencies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.template
- ansible.builtin.systemd_service
- systemd unit files
- systemd service dependencies
- Linux service management

## Sources Consulted
- systemd.unit official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.target official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.target.html
- systemd.special official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html
- Ansible ansible.builtin.systemd_service official documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Local systemd man pages and CLI help for systemd 255: systemd.unit(5), systemd.service(5), systemctl --help, systemd-analyze --help

## Issues Found
- The `Requires=` description implied that any failure of the required unit automatically fails the dependent unit. Updated it to the documented behavior: if the required unit fails to activate and the dependent unit is ordered after it, the dependent unit will not start.
- The examples used `ansible.builtin.systemd`, which is now a backward-compatible alias for `ansible.builtin.systemd_service`. Updated the examples to the current FQCN recommended by Ansible documentation.
- The custom target example claimed that `systemctl stop myapp.target` stops the full stack, but plain `Requires=` dependencies do not make systemd stop required units when the target is stopped. Added `PropagatesStopTo=` to the target so stop requests on `myapp.target` are propagated to the stack services.

## Review Notes
- The post correctly explains that ordering dependencies and requirement dependencies are independent, and that `Requires=` or `Wants=` should commonly be paired with `After=` when startup order matters.
- `Type=forking` is valid, but systemd documentation recommends `PIDFile=` with forking services and generally prefers `notify`, `notify-reload`, or other non-forking readiness models where available. This is a future improvement rather than a correctness blocker for the examples.
