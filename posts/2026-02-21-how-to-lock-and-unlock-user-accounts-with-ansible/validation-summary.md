# Validation Summary: How to Lock and Unlock User Accounts with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.user
- ansible.builtin.command
- ansible.builtin.shell
- ansible.builtin.copy
- ansible.builtin.file
- ansible.builtin.lineinfile
- Linux shadow passwords
- shadow-utils usermod and passwd
- PAM pam_faillock
- OpenSSH key-based authentication

## Sources Consulted
- Ansible ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.shell module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Linux passwd(1) manual page from shadow-utils: https://man7.org/linux/man-pages/man1/passwd.1.html
- Linux usermod(8) manual page from shadow-utils: https://man7.org/linux/man-pages/man8/usermod.8.html
- faillock.conf(5) manual page: https://manpages.ubuntu.com/manpages/jammy/man5/faillock.conf.5.html

## Issues Found
- The PAM example said Ansible could set up automatic locking by configuring PAM, and the inline comment said to install pam_faillock, but the task only writes `/etc/security/faillock.conf`. The faillock.conf manual states that this file is read by `pam_faillock`; it does not enable `pam_faillock` in every PAM stack. I changed the text to say this applies when the PAM stack already uses `pam_faillock`, and changed the comment to "Configure pam_faillock options."
- The audit logging example used `group: adm` while targeting `hosts: all`. The `adm` group is common on Debian-family systems but is not portable across all Linux distributions. I changed it to `group: root` so the example is more generally valid.

## Review Notes
The core `password_lock` examples match the official Ansible documentation: `password_lock: yes` locks the password, `password_lock: no` unlocks it, and the option only locks the password rather than fully disabling every possible login method. The Linux explanation also matches the shadow-utils `passwd` and `usermod` documentation: password locking prepends `!`, SSH keys may still work, and `passwd -S` reports password status as `L`, `P`, or `NP`. The full lockout examples are reasonable but still simplified for production because key locations, shells, PAM configuration, and centralized identity providers can vary by distribution and environment.
