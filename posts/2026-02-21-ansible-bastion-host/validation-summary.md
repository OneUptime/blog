# Validation Summary: How to Use Ansible to Set Up a Bastion Host

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- OpenSSH server and client configuration
- SSH ProxyJump
- UFW
- fail2ban
- auditd
- systemd
- Mosh
- Bash session recording

## Sources Consulted
- Ansible `apt` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible `systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- OpenSSH release notes: https://www.openssh.org/releasenotes.html
- Ubuntu OpenSSH server documentation: https://ubuntu.com/server/docs/how-to/security/openssh-server/
- Mosh official documentation: https://mosh.org/
- fail2ban `jail.conf` source: https://github.com/fail2ban/fail2ban/blob/master/config/jail.conf
- fail2ban UFW action source: https://github.com/fail2ban/fail2ban/blob/master/config/action.d/ufw.conf

## Issues Found
- Removed the obsolete `Protocol 2` directive from the `sshd_config` template. Current OpenSSH documentation no longer lists this directive, and OpenSSH removed SSHv1 support years ago.
- Changed the handler service name from `sshd` to `ssh`, matching Ubuntu's documented `systemctl restart ssh.service` command for OpenSSH server.
- Replaced the multi-line `lineinfile` task for `/etc/profile.d/session-record.sh` with `copy`. Ansible documents `lineinfile` as a single-line editing module; `copy` is appropriate for deploying this multi-line shell snippet.
- Changed the session log directory mode from `0700` to `1733` so SSH users can create log files while still preventing directory listing and deletion of other users' files.
- Updated the session recording script to create log files with `mktemp`, set log file permissions to `0600`, and guard against recursive profile execution with `BASTION_RECORDING_ACTIVE`.
- Removed unused `allowed_targets` values from the role defaults and adjusted the introductory wording from restricting what users can do after connecting to restricting which users can connect. The provided OpenSSH configuration uses `PermitOpen any` and did not implement per-user target restrictions.

## Review Notes
- The examples use short Ansible module names. This is common in tutorials, but `ufw` requires the `community.general` collection and `authorized_key` is provided by the `ansible.posix` collection when using `ansible-core`.
- The fail2ban `logpath = /var/log/auth.log` example is appropriate for Debian and Ubuntu systems that write SSH authentication logs there. Systems using only journald may need a systemd backend or distribution-specific log path.
