# Validation Summary: How to Automate User and Group Management with Ansible on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Ansible playbooks
- `ansible.builtin.user`
- `ansible.builtin.group`
- `ansible.posix.authorized_key`
- Ansible Vault
- sudoers configuration
- PAM password quality and password aging

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.posix.authorized_key` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/authorized_key_module.html
- Ansible password hash filter documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_hash_filter.html
- Ansible FAQ on generating encrypted passwords for the user module: https://docs.ansible.com/projects/ansible/latest/reference_appendices/faq.html#how-do-i-generate-encrypted-passwords-for-the-user-module
- Ansible Vault documentation: https://docs.ansible.com/projects/ansible/latest/vault_guide/vault_using_encrypted_content.html
- Red Hat Enterprise Linux 9 authentication and authorization documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/configuring_authentication_and_authorization_in_rhel
- Red Hat Customer Portal note on `PASS_MIN_LEN` in RHEL 9: https://access.redhat.com/solutions/7093889
- sudoers manual: https://www.sudo.ws/docs/man/1.9.9/sudoers.man/
- Linux `chage(1)` manual page: https://man7.org/linux/man-pages/man1/chage.1.html

## Issues Found
- The password hash generation command used Python's `crypt` module. Replaced it with Ansible's documented `password_hash('sha512')` approach.
- The password policy section used `PASS_MIN_LEN` in `/etc/login.defs` for password length. On RHEL 9, password quality checks are handled through PAM and `pam_pwquality`, so the example now sets `minlen` in `/etc/security/pwquality.conf`.
- The existing-user password aging task used a raw `chage` command and suppressed change reporting. Replaced it with idempotent `ansible.builtin.user` password expiration options.
- The audit task said it found users with sudo access and mentioned wheel or sudo groups, but the command only listed direct members of the RHEL `wheel` group. Updated the task name, comment, registered variable, and debug output to match the actual command.

## Review Notes
The `ansible.posix.authorized_key` example correctly batches multiple keys with newline joining when using `exclusive: true`, which matches the module documentation. The post assumes the `ansible.posix` collection is available; that collection is included with the full `ansible` package but not with `ansible-core` alone.
