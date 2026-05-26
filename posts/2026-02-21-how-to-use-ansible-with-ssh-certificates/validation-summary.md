# Validation Summary: How to Use Ansible with SSH Certificates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH user certificates
- OpenSSH host certificates
- SSH CA trust configuration
- Ansible SSH connection configuration
- Ansible playbooks and modules
- Cron-based certificate renewal

## Sources Consulted
- OpenSSH `ssh-keygen(1)` manual: https://man.openbsd.org/ssh-keygen
- OpenSSH `sshd_config(5)` manual: https://man.openbsd.org/sshd_config
- OpenSSH `ssh_config(5)` manual: https://man.openbsd.org/ssh_config
- Ansible `ansible.builtin.ssh` connection plugin documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/ssh_connection.html
- Local OpenSSH 9.6p1 man pages and `ssh-keygen` certificate output checks

## Issues Found
- The introduction and diagram implied that servers or clients verify certificates by contacting the CA. Updated the wording to clarify that OpenSSH verifies certificate signatures locally using the trusted CA public key.
- The sample `ssh-keygen -L` output omitted the default `permit-X11-forwarding` extension shown by current OpenSSH when no restrictive certificate options are used. Added it to the sample output.
- The Ansible bootstrap playbook used a single global `AuthorizedPrincipalsFile` path containing both `ansible` and `deploy`. With `TrustedUserCAKeys`, that file would apply to every login account and could allow certificates with those principals to authenticate as unintended users. Updated the example to use `/etc/ssh/auth_principals/%u` and create a principals file only for the `ansible` account.
- The restrictions section stated that Ansible typically needs `permit-pty`. Ansible does not allocate a PTY by default. Updated the guidance to say `permit-pty` is only needed when privilege escalation or commands allocate one.

## Review Notes
- The OpenSSH certificate commands and flags (`-s`, `-I`, `-n`, `-V`, `-z`, `-h`, and certificate `-O` options) are current and match OpenSSH documentation.
- The Ansible configuration keys `private_key_file`, `remote_user`, `host_key_checking`, and `ssh_args` are valid for the documented SSH connection plugin.
- Service names for restarting SSH vary by distribution (`sshd` on many systems, `ssh` on some Debian/Ubuntu systems). The examples are technically valid for systems using the `sshd` service name, but a production role may need OS-specific service handling.
