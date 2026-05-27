# Validation Summary: How to Use Ansible to Configure Locale Settings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- community.general.locale_gen
- Linux locale configuration
- systemd localectl and locale.conf
- Debian locale-gen and /etc/locale.gen
- OpenSSH AcceptEnv and SendEnv
- PAM environment configuration
- PostgreSQL locale settings
- MySQL character set and collation settings
- Python UTF-8 environment settings

## Sources Consulted
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible community.general.locale_gen module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/locale_gen_module.html
- Ansible changed_when playbook documentation: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html#defining-changed
- systemd locale.conf documentation: https://www.freedesktop.org/software/systemd/man/latest/locale.conf.html
- Linux locale(7) manual: https://man7.org/linux/man-pages/man7/locale.7.html
- Debian locale-gen manual: https://manpages.debian.org/locale-gen
- OpenSSH sshd_config AcceptEnv documentation: https://man.openbsd.org/sshd_config
- OpenSSH ssh_config SendEnv documentation: https://man.openbsd.org/ssh_config
- PostgreSQL client connection locale settings: https://www.postgresql.org/docs/current/runtime-config-client.html
- MySQL character set configuration documentation: https://dev.mysql.com/doc/refman/8.4/en/charset-configuration.html
- Python command line and environment documentation: https://docs.python.org/3/using/cmdline.html

## Issues Found
- Removed `LC_ALL` from persistent system locale configuration examples. `LC_ALL` overrides all locale categories and systemd's `locale.conf` explicitly does not support configuring it, so the examples now set `LANG` and `LANGUAGE` instead.
- Removed `C.UTF-8` from Debian locale generation lists. Debian's `locale-gen` builds locales listed in `/etc/locale.gen`, while `C.UTF-8` is a special UTF-8 capable C locale rather than a normal generated locale entry for that file.
- Made the `localectl set-locale` task idempotent by checking `localectl status` first. The original task forced `changed_when: true`, so it would report a change on every run.
- Updated the SSH restart handler to use `ssh` on Debian and `sshd` elsewhere. Debian-based systems commonly use the `ssh` service name, while RHEL-family systems use `sshd`.
- Updated the validation playbook's `locale -a` check to accept both `en_US.UTF-8` and the common `en_US.utf8` output spelling.

## Review Notes
The examples remain intentionally generic. Real deployments may still need distro-specific package names, database service names, PostgreSQL version paths, and site policy decisions about whether users should be allowed to override locale categories.
