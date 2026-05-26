# Validation Summary: How to Use Ansible to Configure PAM Authentication

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Ansible
- Linux-PAM
- `community.general.pamd`
- `pam_faillock`
- `pam_pwquality`
- OpenSSH `UsePAM`
- `pam_access`
- `pam_limits`
- `pam_time`
- `pam_pwhistory`
- `pamtester`

## Sources Consulted
- Ansible `community.general.pamd` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/pamd_module.html
- Ansible `ansible.builtin.copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Linux-PAM `pam_faillock(8)` manual: https://man7.org/linux/man-pages/man8/pam_faillock.8.html
- Linux-PAM `pam_unix(8)` manual: https://man7.org/linux/man-pages/man8/pam_unix.8.html
- Linux-PAM `pam_pwhistory(8)` manual: https://man7.org/linux/man-pages/man8/pam_pwhistory.8.html
- Ubuntu `pam_pwquality(8)` manual: https://manpages.ubuntu.com/manpages/jammy/man8/pam_pwquality.8.html
- Linux-PAM `access.conf(5)` manual: https://man7.org/linux/man-pages/man5/access.conf.5.html
- Linux-PAM `time.conf(5)` manual: https://man7.org/linux/man-pages/man5/time.conf.5.html
- Debian `pam-auth-update(8)` manual: https://manpages.debian.org/man/pam-auth-update
- Debian `pamtester(1)` manual: https://manpages.debian.org/testing/pamtester/pamtester.1.en.html
- Ubuntu `sshd_config(5)` manual for `UsePAM`: https://manpages.ubuntu.com/manpages/jammy/man5/sshd_config.5.html

## Issues Found
- The post description promised multi-factor authentication, but the article does not configure MFA. Changed it to match the actual content: password policies, account lockout, SSH access control, and resource limits.
- The Debian/Ubuntu `pam_faillock` example added only a `preauth` line to `common-auth`. Linux-PAM requires a complete `pam_faillock` stack, and Debian's generated `common-auth` control flow can be broken by naive line insertion. Replaced the snippet with guidance to use `pam-auth-update` or a tested site PAM profile before relying on `faillock.conf`.
- The `access.conf` example used `@admins` and `@developers` for local groups. In `access.conf`, local groups should be written as `(group)`; `@name` is netgroup syntax. Changed those entries to `(admins)` and `(developers)`.
- The `pam_time` example described allow rules, but `time.conf` rules are deny rules when they match. Changed the sample to deny the contractors netgroup outside business hours and made the broader non-admin outside-hours deny rule active.
- The password history example used `pam_unix.so remember=...`. Current Linux-PAM documentation says `pam_pwhistory` should be used instead. Replaced the RHEL and Debian examples with `pam_pwhistory.so remember={{ password_remember }}` inserted before `pam_unix.so`.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. PAM stack ordering is distribution-specific and high risk; future improvements should prefer distro-native tools such as `authselect` on RHEL-family systems and `pam-auth-update` on Debian-family systems when showing fully automated stack changes.
