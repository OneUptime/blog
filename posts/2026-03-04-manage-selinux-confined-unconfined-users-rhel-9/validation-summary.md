# Validation Summary: How to Manage SELinux Confined and Unconfined Users on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- SELinux targeted policy
- SELinux confined and unconfined users
- SELinux user mappings with `semanage login`
- SELinux booleans with `setsebool`
- SELinux process contexts and audit troubleshooting

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using SELinux", Chapter 3: Managing confined and unconfined users: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- `semanage-login(8)` manual page, policycoreutils-python-utils: https://www.mankier.com/8/semanage-login
- `setsebool(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/setsebool.8.html
- `ps(1)` Linux manual page, SELinux security context options: https://www.man7.org/linux/man-pages/man1/ps.1.html

## Issues Found
- The opening description overgeneralized that most users and processes run as `unconfined_u` in `unconfined_t`. Red Hat documents that Linux users are mapped to `unconfined_u` by default; the text was narrowed to interactive user sessions and minimal SELinux restrictions.
- The capability table incorrectly said `guest_u` cannot execute in `/tmp` or home directories, and that `user_u` execution there "depends". Red Hat documents that `staff_t`, `user_t`, `guest_t`, and `xguest_t` can execute applications in home directories and `/tmp` by default, so the table was corrected.
- The table treated setuid execution for `user_u` and `guest_u` as a blanket "No". Red Hat documents that these domains can run setuid applications only when policy permits it, so the row was updated.
- The system-wide default mapping examples omitted the MLS/MCS range Red Hat uses in its RHEL 9 procedure. The examples now use `-r s0` with `user_u`.
- The booleans section referenced `user_cron_spool_job`, which was not found in current RHEL 9 documentation, and described `staff_exec_content` as allowing unconfined applications. The examples were corrected to documented user execution-content booleans and accurate descriptions.
- The `staff_u` sudo troubleshooting section used a generic sudoers rule and incorrectly required `staff_exec_content`. Red Hat documents the sudoers rule with `TYPE=sysadm_t ROLE=sysadm_r`, so the example was corrected and the unrelated boolean requirement was removed.

## Review Notes
The remaining commands and examples are broadly consistent with RHEL 9 SELinux documentation and standard SELinux tooling. Some operational guidance, such as policy generation for third-party services, is necessarily environment-specific and should be tested on a staging system before production rollout.
