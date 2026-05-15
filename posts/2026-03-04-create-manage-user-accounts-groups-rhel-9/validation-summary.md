# Validation Summary: How to Create and Manage User Accounts and Groups on RHEL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux local user and group management
- shadow-utils commands: `useradd`, `usermod`, `userdel`, `groupadd`, `groupdel`, `passwd`, `chage`
- Linux account files: `/etc/passwd`, `/etc/shadow`, `/etc/group`, `/etc/gshadow`, `/etc/login.defs`, `/etc/skel`
- GNU coreutils commands: `groups`, `id`
- NSS lookup command: `getent`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing users and groups": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-users-and-groups_configuring-basic-system-settings
- Local `useradd(8)` man page, shadow-utils 4.13
- Local `usermod(8)` man page, shadow-utils 4.13
- Local `userdel(8)` man page, shadow-utils 4.13
- Local `groupadd(8)` and `groupdel(8)` man pages, shadow-utils 4.13
- Local `passwd(1)`, `chage(1)`, `passwd(5)`, `shadow(5)`, `group(5)`, `gshadow(5)`, and `login.defs(5)` man pages
- GNU coreutils local man pages for `groups(1)` and `id(1)`: https://www.gnu.org/software/coreutils/
- GNU C Library local man page for `getent(1)`: https://www.gnu.org/software/libc/
- Red Hat Enterprise Linux 9 authentication documentation for PAM password quality behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_authentication_and_authorization_in_rhel/configuring_authentication_and_authorization_in_rhel

## Issues Found
- The post described `usermod -L`, `usermod -U`, `passwd -l`, and `passwd -u` as locking or unlocking the account. These commands lock or unlock the password hash, and users might still authenticate by other methods such as SSH keys. Updated the wording to say password locking/unlocking.
- The `/etc/shadow` table listed only eight fields. The documented shadow file format has nine colon-separated fields, with the ninth reserved for future use. Added the missing reserved field.
- The `getent group developers` example was described as listing all members of a group. It shows the group database entry and its supplementary member list; users whose primary group is `developers` might not appear in that field. Updated the command comment accordingly.
- The `/etc/group` fourth field was described as a generic member list. Clarified that it is the comma-separated supplementary member list.
- The `/etc/login.defs` list included `PASS_MIN_LEN`, which is not documented by the current `login.defs(5)` settings checked for this review. Replaced it with `PASS_WARN_AGE`, which is documented and matches the surrounding password-aging defaults.
- The `/etc/gshadow` description only mentioned encrypted group passwords. Updated it to describe secure group information more accurately, while preserving the note that group passwords are rarely used.

## Review Notes
The rest of the commands and file-format explanations matched the RHEL 9 documentation and local man pages checked during review. Password length and complexity policy on RHEL 9 is generally enforced through PAM/libpwquality rather than `PASS_MIN_LEN` in `/etc/login.defs`.
