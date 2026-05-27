# Validation Summary: How to Use Ansible to Manage SystemD Targets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- systemd targets and unit dependencies
- systemctl target-management commands
- Linux server administration

## Sources Consulted
- systemd.target(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.target.html
- systemd.unit(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.special(7), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.special.html
- systemctl(1), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- runlevel(8), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/runlevel.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- ansible.builtin.command module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.copy module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/copy_module.html
- ansible.builtin.subelements filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/subelements_filter.html

## Issues Found
- The runtime target-switching example used `ansible.builtin.systemd` with `state: started`, which starts a target but does not isolate it or stop units outside that target. Changed the task to run `systemctl isolate multi-user.target`, matching the surrounding explanation and systemctl behavior.
- The audit example collected available targets but did not include them in the generated report. Added `available_targets` to the `target_report` fact.
- The custom target example attempted to attach nginx to `webapp.target` using a service drop-in with only an `[Install]` section. Replaced that with `systemctl add-wants webapp.target nginx.service`, which is the documented way to add a wants dependency without modifying the service unit.
- The custom target explanation said the target depends on services being up, which was too strong for the example. Updated it to say the target pulls services in when it starts.
- The dependency validation example listed `network.target` as a required dependency of `multi-user.target`. This is not guaranteed by systemd; services that need networking usually add their own dependencies. Removed `network.target` from the required dependency list.
- The dependency validation assertion referenced `item.0.key`, but loop items from the registered result keep the original target key under `item.0.item.key`. Updated the failure and success messages accordingly.
- The custom target unit-file comment still described the old `WantedBy=webapp.target` approach. Updated it to match the corrected `systemctl add-wants` method.

## Review Notes
The YAML snippets parse successfully as YAML. The examples are still illustrative and assume named services such as `nginx.service` are installed on the managed hosts.
