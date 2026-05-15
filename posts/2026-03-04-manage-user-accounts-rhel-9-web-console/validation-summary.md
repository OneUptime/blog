# Validation Summary: How to Manage User Accounts Using the RHEL Web Console

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- RHEL web console / Cockpit
- Linux local user and group management
- shadow-utils commands: `useradd`, `usermod`, `userdel`, `passwd`, `chage`
- SSH `authorized_keys`
- PAM `pam_pwquality`
- systemd login sessions with `loginctl`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing user accounts in the web console": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-users-and-groups_configuring-basic-system-settings
- Cockpit Project documentation, "User Tools" and "Privileges and Permissions": https://cockpit-project.org/guide/latest/features.html and https://cockpit-project.org/guide/latest/privileges
- `passwd(1)` Linux manual page: https://man7.org/linux/man-pages/man1/passwd.1.html
- `usermod(8)` Linux manual page: https://man7.org/linux/man-pages/man8/usermod.8.html
- Local `chage(1)`, `useradd(8)`, `userdel(8)`, `gpasswd(1)`, `loginctl(1)`, and `pam_pwquality(8)` man pages
- OpenSCAP Security Guide for RHEL 9 password quality examples: https://static.open-scap.org/ssg-guides/ssg-rhel9-guide-pci-dss.html

## Issues Found
- The post described a "Server Administrator" access level during account creation. Red Hat's RHEL 9 web console documentation shows account creation followed by adding groups from the account details page. I changed this to say that groups are added after creation and that `wheel` should be used for sudo access.
- The post said account locking prevents login. The official `passwd(1)` and `usermod(8)` documentation says password locking disables password authentication but does not necessarily disable other authentication tokens such as SSH keys. I clarified the text and command comments, and added account expiration in the offboarding example to block other login methods.

## Review Notes
- The CLI examples use current shadow-utils commands and valid options for RHEL-style systems.
- The `pwquality.conf.d` example uses valid `pam_pwquality` settings. Negative credit values correctly require at least one character from the corresponding class.
