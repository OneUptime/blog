# Validation Summary: How to Use Ansible to Configure System Journal (journald)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- systemd-journald
- journald.conf configuration
- journalctl maintenance commands
- systemd-journal-upload
- Cron-based maintenance

## Sources Consulted
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/latest/journald.conf.html
- systemd-journald service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-journald.service.html
- journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd journal-upload.conf manual: https://www.freedesktop.org/software/systemd/man/latest/journal-upload.conf.html
- systemd-journal-upload service manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-journal-upload.service.html
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Local systemd man pages for journald.conf(5), systemd-journald.service(8), journalctl(1), and systemd.time(7)

## Issues Found
- The post stated that persistent storage requires creating `/var/log/journal/`. That is only accurate for the default `Storage=auto` behavior; with `Storage=persistent`, journald stores logs under `/var/log/journal/` and creates the hierarchy if needed when `/var` is writable. Updated the explanation and troubleshooting note to distinguish `Storage=auto` from `Storage=persistent`.
- The Ansible playbook created `/var/log/journal` with group `systemd-journal` before ensuring that group exists. Moved the group task before the file task so the playbook works on systems where the group is not already present.
- The examples used `ansible.builtin.systemd`, which is retained as an alias, but current Ansible documentation names `ansible.builtin.systemd_service` as the module. Updated the service tasks to use the current FQCN.

## Review Notes
The journald configuration keys, time and size units, `journalctl --disk-usage`, `--vacuum-time`, `--vacuum-size`, and `--verify` commands, and journal-upload configuration fields are consistent with the systemd documentation. `journalctl` vacuum operations apply to archived journal files, so disk usage may still include active files after cleanup.
