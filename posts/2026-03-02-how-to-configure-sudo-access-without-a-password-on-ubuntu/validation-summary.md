# Validation Summary: How to Configure sudo Access Without a Password on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- sudo and sudoers
- visudo
- Linux user and group management
- Ansible privilege escalation
- OpenSSH server configuration
- systemd/systemctl
- Linux audit logs and journald

## Sources Consulted
- sudoers(5) manual: https://man7.org/linux/man-pages/man5/sudoers.5.html
- sudo CLI help from local sudo 1.9.15p5
- visudo(8) local manual/help
- usermod(8) manual: https://man7.org/linux/man-pages/man8/usermod.8.html
- Ansible configuration settings documentation: https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config

## Issues Found
- The explanation of `(runas_user)` said `(ALL)` was "for root." In sudoers, omitting the runas spec defaults to root, while `(ALL)` allows running as any target user. Updated the wording to reflect the sudoers runas behavior accurately.
- The Ansible SSH key example generated the key while logged in as the managed-node user, but the later `private_key_file` setting referred to a key on the Ansible control machine. Moved key generation and `ssh-copy-id` commands to the control-machine section.
- The Ansible configuration block was marked as YAML and included an inline `#` comment after a value. Changed the block to INI and moved the comment to its own line so the configuration format is accurate.
- The security hardening example attempted to prevent shells by appending `!/bin/sh` and `!/bin/bash` to a `systemctl restart *` rule. Those negations do not constrain a rule that only grants `systemctl`, and broad sudoers argument wildcards are risky. Replaced it with an exact `systemctl restart nginx` example and a `NOEXEC` example for shell-escape-capable commands.
- The SSH hardening snippet described restricting a CI user to specific commands but did not include a directive that enforces this. Added a `Match User cirunner` block with `DisableForwarding yes` and `ForceCommand /usr/local/bin/ci-command-wrapper`.

## Review Notes
The reviewed sudoers snippets were syntax-checked with `visudo -c -f` using a temporary sudoers file, and the Ansible `ansible.cfg` portion was parsed as INI with Python's `configparser`. The guide remains version-general for Ubuntu; exact binary paths such as `/usr/bin/systemctl`, `/usr/bin/journalctl`, and `/bin/cat` should still be checked with `command -v` on nonstandard systems.
