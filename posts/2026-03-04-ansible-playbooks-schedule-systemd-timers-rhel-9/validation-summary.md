# Validation Summary: How to Run Ansible Playbooks on Schedule with systemd Timers on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- systemd services
- systemd timers
- Ansible playbooks
- Ansible Vault
- journald
- cron/cronie scheduling comparison

## Sources Consulted
- systemd.timer manual: https://www.freedesktop.org/software/systemd/man/systemd.timer.html
- systemd.service manual: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- systemd.time manual: https://www.freedesktop.org/software/systemd/man/systemd.time.html
- Ansible `ansible-playbook` CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-playbook.html
- Ansible Vault password file documentation: https://docs.ansible.com/projects/ansible-core/devel/vault_guide/vault_managing_passwords.html
- Cronie `crontab(5)` manual page for `RANDOM_DELAY`: https://www.mankier.com/5/crontab
- Local `systemd-analyze calendar` output for all calendar expressions shown in the post
- Local systemd man pages for `Persistent=`, `RandomizedDelaySec=`, `ExecStopPost=`, `$EXIT_STATUS`, and timer unit activation behavior

## Issues Found
- The cron comparison table said random delay was "Not built in". On RHEL-family systems, cron is commonly provided by cronie, whose crontab format supports `RANDOM_DELAY`. Changed this to "Manual or implementation-specific setup" while keeping `RandomizedDelaySec` as the systemd timer mechanism.
- The patching service used `--limit "{{ ansible_hostname }}"`. `ansible-playbook --limit` takes a host pattern; the Jinja expression would be passed literally from the systemd unit and would not resolve to the local hostname. Changed the example to `--limit localhost`, matching the sample inventory in the post.
- The setup commands created `/opt/ansible/inventory` as a directory, then attempted to write an inventory file to the same path. Replaced the directory creation with explicit `/opt/ansible`, `/opt/ansible/playbooks`, and `/opt/ansible/roles` directories, then created `/opt/ansible/inventory` as a file.
- The setup commands used unprivileged redirection to write under `/opt/ansible` after changing ownership to the `ansible` user. Replaced those commands with `sudo tee`, ownership, and mode commands so the inventory and vault password file are created with permissions readable by the service user.
- The examples used `User=ansible` before showing how that service account exists. Added an idempotent `id ansible || useradd ...` command to the setup snippet.

## Review Notes
- The `mail` command used by the backup failure hook requires a mail client/package and local mail delivery configuration; the unit syntax and `$EXIT_STATUS` usage are correct.
- `Persistent=true` only catches up `OnCalendar=` timers after the timer is activated again, and the delayed run is still subject to `RandomizedDelaySec=`, which matches the post's usage.
