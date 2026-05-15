# Validation Summary: How to Set Default Umask Values for New Files and Directories on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux file permissions and umask
- Bash shell startup files
- PAM and pam_umask
- systemd service unit UMask
- GNU coreutils cp and mv behavior

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring basic system settings, "Managing file system permissions" and default umask procedures: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- Linux-PAM pam_umask(8) manual page: https://www.man7.org/linux/man-pages/man8/pam_umask.8.html
- systemd.exec(5) UMask documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- GNU Coreutils cp invocation documentation: https://www.gnu.org/software/coreutils/manual/html_node/cp-invocation.html
- GNU Coreutils mv invocation documentation: https://www.gnu.org/software/coreutils/manual/html_node/mv-invocation.html

## Issues Found
- The post described `0022` as "the RHEL default umask", which is too broad for RHEL systems where standard interactive users commonly get `002` through bash startup logic while `/etc/login.defs` uses `022`. Changed the phrase to "a umask of `0022`" so the example remains correct without overstating the default.
- The `/etc/profile` and `/etc/bashrc` example said it set a restrictive umask for all users, but the `else` branch still used `022`. Changed the `else` branch to `027` so the snippet matches its description.
- The `/etc/profile.d/` section said to "make it executable" but used `chmod 644`. Changed the comment to "Set readable permissions" because `/etc/profile` sources readable profile scripts; executable mode is not required.
- The `pam_umask` priority list was inaccurate. Replaced it with the documented lookup order: user GECOS `umask=`, module `umask=` argument, `/etc/login.defs`, then `/etc/default/login`, and noted that shell profile files can override the value later.
- The per-user `pam_umask` section incorrectly referred to `/etc/shadow`. Changed it to the user's GECOS field, which is what `pam_umask` documents for per-user `umask=` entries.
- The systemd service example said a service with umask `0077` creates files only root can read. Changed this to "only the service user" because ownership depends on the account running the service.
- The `mv` gotcha said no new file is created unconditionally. Clarified that this applies to moves within the same file system; cross-file-system moves may copy and remove while preserving attributes.

## Review Notes
The post is technically relevant and the commands/configuration examples are broadly current for RHEL 9. Future improvements could mention that RHEL 9 PAM stacks are commonly managed by authselect, so persistent PAM changes should be made through the active authselect profile rather than by manually editing generated PAM files.
