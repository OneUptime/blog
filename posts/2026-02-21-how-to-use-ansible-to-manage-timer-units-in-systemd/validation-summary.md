# Validation Summary: How to Use Ansible to Manage Timer Units in systemd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- systemd service units
- systemd timer units
- systemd calendar expressions
- Linux shell scripting
- PostgreSQL backup commands

## Sources Consulted
- systemd.timer official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.time official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.time.html
- systemd-analyze official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-analyze.html
- Ansible ansible.builtin.systemd_service official documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Local command verification with `systemd-analyze calendar` for the calendar expressions used in the article.

## Issues Found
- The introduction said timers can trigger on events besides time. systemd timers trigger from realtime calendar expressions or monotonic time intervals relative to events such as boot, startup, or unit activation, so the wording was corrected.
- The post said missed timers can be caught up with `Persistent=true`. Official systemd documentation states `Persistent=` only has an effect on timers configured with `OnCalendar=`, so the wording and template comment now specify calendar-based missed runs.
- The "How Timers Work" section said a timer is always paired with a service unit. systemd timers activate another unit and default to a same-name service, but `Unit=` can target another non-timer unit, so the wording was corrected.
- The PostgreSQL playbook deployed the role before showing the backup script task, which could start the timer before the executable and backup directory existed. The example now uses `pre_tasks` to create the backup directory and deploy the script before enabling and starting the timer.

## Review Notes
The Ansible examples use `ansible.builtin.systemd`, which remains a documented alias for `ansible.builtin.systemd_service`; future updates could switch to the newer FQCN for clearer documentation linking.
