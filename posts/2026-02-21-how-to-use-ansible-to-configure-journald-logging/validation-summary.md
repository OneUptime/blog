# Validation Summary: How to Use Ansible to Configure journald Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- systemd-journald
- journalctl
- systemd unit drop-ins
- rsyslog
- systemd-journal-upload
- Linux logging

## Sources Consulted
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd.exec manual for LogLevelMax and LogRateLimit settings: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- Ansible ansible.builtin.systemd_service documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.template documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible ansible.builtin.cron documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The `Compress=` comment said it compressed journal files above a threshold. Updated it to say it compresses journal data objects above the default threshold, matching journald.conf behavior.
- The `MaxFileSec=` comment incorrectly described it as the maximum number of journal files to keep. Updated it to describe time-based rotation of individual journal files.
- The `SplitMode=` comment described values as `yes` and `no`, but journald accepts `uid` and `none`. Updated the comment to use the correct values.
- The `Audit=` comment was too broad. Updated it to clarify that it tells the kernel to generate audit records on journald startup, rather than controlling all audit log collection.
- The journal health verification snippet displayed `disk_usage.stdout` without registering `disk_usage` in that snippet. Added the missing `journalctl --disk-usage` task.
- The service log-level drop-in example wrote into `/etc/systemd/system/chatty-service.service.d/` without ensuring that directory exists. Added a directory creation task.

## Review Notes
The examples are generally accurate for current systemd and Ansible. The Ansible examples use `ansible.builtin.systemd`, which remains a backward-compatible alias for `ansible.builtin.systemd_service`; future updates could switch to `ansible.builtin.systemd_service` for naming clarity.
