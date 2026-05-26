# Validation Summary: How to Use Ansible with MFA/2FA SSH Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- OpenSSH client and server configuration
- SSH certificates
- FIDO2/OpenSSH security keys
- Linux PAM
- Google Authenticator PAM MFA
- Linux auditd
- sudoers configuration

## Sources Consulted
- OpenSSH sshd_config(5): https://man.openbsd.org/sshd_config
- OpenSSH ssh-keygen(1): https://man.openbsd.org/ssh-keygen
- OpenSSH ssh-add(1), local man page
- Linux-PAM pam_succeed_if(8): https://man7.org/linux/man-pages/man8/pam_succeed_if.8.html
- Linux-PAM pam_access(8): https://man7.org/linux/man-pages/man8/pam_access.8.html
- Linux audit.rules(7): https://man7.org/linux/man-pages/man7/audit.rules.7.html
- Linux auditctl(8): https://www.linuxman7.org/linux/man-pages/man8/auditctl.8.html
- Ansible ansible.builtin.user module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible ansible.builtin.blockinfile module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/blockinfile_module.html
- Ansible ansible.posix.authorized_key module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible ansible.builtin.service module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/service_module.html

## Issues Found
- The IP-based PAM example used `/etc/security/access-local.conf` in one snippet and `/etc/security/access-mfa.conf` in the Ansible task. Changed the manual snippet to consistently use `/etc/security/access-mfa.conf`.
- The SSH certificate section claimed certificates can include an MFA-bypass extension and used `ssh-keygen -O no-touch-required` while signing a normal SSH key. OpenSSH documents `no-touch-required` as a FIDO authenticator option, not a generic MFA-bypass extension for ordinary certificates. Reworded the section and changed the example to use a real certificate constraint, `source-address=10.0.0.50/32`, plus `TrustedUserCAKeys`.
- The FIDO resident-key note said the private key material stays on the hardware device. OpenSSH documents resident keys as storing the key handle on the authenticator and being loadable with `ssh-add -K`. Updated the wording accordingly.
- The Ansible `blockinfile` example inserted a `Match User ansible` block immediately after the global `AuthenticationMethods` line. Because OpenSSH `Match` blocks continue until the next `Match` or EOF, this could unintentionally scope later `sshd_config` directives. Changed `insertafter` to `EOF`.
- The `lineinfile` task that changes global `AuthenticationMethods` validated the file but did not notify the SSH restart handler. Added `notify: restart sshd`.

## Review Notes
- The examples use short Ansible module names. They are still commonly accepted when the relevant collections are installed, but future cleanup could switch examples to fully qualified collection names such as `ansible.builtin.user` and `ansible.posix.authorized_key`.
- Service names vary by distribution (`ssh` on some Debian/Ubuntu systems, `sshd` on many RHEL-family systems). The post's examples are technically valid for systems using `sshd`, but operators may need to adjust the service name for their distribution.
