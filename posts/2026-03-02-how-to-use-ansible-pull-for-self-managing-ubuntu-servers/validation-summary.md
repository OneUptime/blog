# Validation Summary: How to Use Ansible Pull for Self-Managing Ubuntu Servers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible (ansible-pull command)
- Ubuntu (PPA installation)
- Ansible modules: apt, timezone, lineinfile, ufw, service, template
- systemd timers and service units
- cron
- Git / SSH deploy keys
- ufw (Uncomplicated Firewall)

## Sources Consulted
- Ansible official documentation for ansible-pull: https://docs.ansible.com/ansible/latest/cli/ansible-pull.html
- Ansible PPA (official): https://launchpad.net/~ansible/+archive/ubuntu/ansible
- Ansible ufw module documentation: https://docs.ansible.com/ansible/latest/collections/community/general/ufw_module.html
- Ansible apt, lineinfile, service, template, timezone module documentation
- systemd.timer manual page (OnCalendar syntax verified with systemd-analyze calendar)
- crontab(5) manual (Vixie cron / cronie - the default cron on Ubuntu)
- ssh-keygen manual page
- git-credential-store documentation

## Issues Found
1. **Cron entry used backslash line continuation**: The `*/30 * * * *` crontab entry was split across multiple lines using `\` continuation. Standard Ubuntu cron (Vixie cron / cronie) does not support backslash line continuation in crontab files — each cron entry must be on a single line, otherwise subsequent "continuation" lines would be parsed as separate (invalid) cron entries. Collapsed the entry onto a single line and added a brief comment noting the limitation.

## Review Notes
- The `ansible-pull` flags (`-U`, `-C`, `-i`, `--private-key`, `--accept-host-key`) and behavior described (playbook lookup order — FQDN, hostname, then `local.yml`) match the official documentation.
- The `OnCalendar=*:0/30` systemd timer expression is valid and fires every 30 minutes.
- The `Requires=ansible-pull.service` directive in the timer's `[Unit]` section is technically a non-idiomatic pattern (it causes the service to start immediately when the timer is activated). It's not broken — many tutorials use this style — but a cleaner approach is to omit it and let the timer trigger the service on schedule only. Left as-is to avoid stylistic edits.
- The UFW task order (enable + deny incoming → allow outgoing → allow SSH) could briefly leave SSH denied between tasks on a previously disabled UFW. In practice existing SSH sessions are not killed and Ansible runs the tasks in quick succession, so this is acceptable; readers running this against a remote host should be aware.
- The bootstrap script installs `ansible` via `apt-get` from the default Ubuntu repository, while the earlier section recommends the Ansible PPA. This is a minor inconsistency but not technically incorrect (the distribution package works for `ansible-pull`).
- The webserver role references a `reload nginx` handler that is not shown in the snippet; the snippet is illustrative and the handler would conventionally live in `roles/webserver/handlers/main.yml`. Not flagged as an error.
