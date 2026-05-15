# Validation Summary: How to Confine Linux Users with SELinux User Mappings on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux user mappings
- SELinux confined users and roles
- `semanage login`
- SELinux booleans
- `sudo` SELinux role/type transitions

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using SELinux", Chapter 3: Managing confined and unconfined users: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/managing-confined-and-unconfined-users_using-selinux
- Red Hat Enterprise Linux 9 documentation, single-page "Using SELinux": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- `semanage-login(8)` man page: https://man7.org/linux/man-pages/man8/semanage-login.8.html
- `crond_selinux(8)` SELinux policy man page: https://www.mankier.com/8/crond_selinux
- `user_selinux(8)` SELinux policy man page: https://www.mankier.com/8/user_selinux

## Issues Found
- The post said `user_u` users cannot run setuid programs. RHEL documentation states `user_t`, `guest_t`, and `xguest_t` users can run setuid applications when SELinux policy permits it, such as `passwd`, but cannot use `su` or `sudo`. Updated the table, diagram, and `user_u` description.
- The post described `xguest_u` as having no networking. RHEL documentation describes `xguest_r` as having limited web-browsing network access. Updated the table.
- The `user_u`, `guest_u`, and `__default__` mapping examples omitted the `-r s0` range used in Red Hat's RHEL 9 examples for confined regular users. Added `-r s0`.
- The post said `guest_u` cannot execute programs from home or temporary directories. RHEL documentation says `guest_t` can execute files in `/home` and `/tmp` by default unless `guest_exec_content` is disabled. Updated the guest description.
- The post used `user_cron_spool_job`, which is not the documented boolean for cron user-domain execution. Replaced it with `cron_userdomain_transition`.
- The post implied `user_exec_content off` only prevents `/tmp` execution. SELinux policy documentation describes it as controlling execution from both home directories and `/tmp` for `user_t`. Updated the comments and test expectation.
- The troubleshooting section claimed `staff_exec_content` enables the `staff_u` to `sysadm_r` sudo transition. RHEL documentation requires a sudoers entry using `TYPE=sysadm_t ROLE=sysadm_r`. Replaced the boolean command with the sudoers configuration.

## Review Notes
The post is technically relevant and valid after corrections. Some behavior can still vary by installed SELinux policy packages and local boolean state, so users should verify current booleans with `semanage boolean -l` on the target system.
