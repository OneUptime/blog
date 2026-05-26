# Validation Summary: How to Use Ansible to Audit User Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux user account databases
- sudo and wheel group auditing
- lastlog account activity reporting
- shadow password aging and expiry data
- SSH authorized_keys auditing
- cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.getent` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/getent_module.html
- Ansible `ansible.builtin.find` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible `ansible.builtin.command` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible `ansible.builtin.shell` module documentation: https://docs.ansible.com/projects/ansible-core/2.18/collections/ansible/builtin/shell_module.html
- Linux `lastlog(8)` manual page: https://man7.org/linux/man-pages/man8/lastlog.8.html
- Linux `chage(1)` manual page: https://man7.org/linux/man-pages/man1/chage.1.html
- Linux `shadow(5)` manual page: https://man7.org/linux/man-pages/man5/shadow.5.html
- Local command help for `lastlog`, `chage`, and `getent`.

## Issues Found
- The `getent` example compared UID fields as strings via `selectattr`, which can misclassify accounts. Changed the playbook to loop over `ansible_facts.getent_passwd` and compare UID values after integer conversion.
- The stale-account playbook defined `stale_threshold_days` and collected the current timestamp, but did not use either value to detect stale accounts. Replaced that logic with `lastlog --before {{ stale_threshold_days }}` and kept a separate report for accounts that have never logged in.
- The no-password check treated a shadow password field of `!` as no password. In Linux shadow files, `!` indicates a locked password, while an empty field permits passwordless login in some contexts. Changed the check and wording to report empty password fields only.
- The password-aging playbook declared `max_password_age_days` but did not use it. Added a policy-age check using the shadow last-change field and the configured threshold.
- The "never changed password" check treated shadow field 3 value `0` as "never changed"; Linux shadow semantics use `0` to force a password change at next login. Updated the task name, message, and condition accordingly.
- Commands that read files from templated paths used shell-style string commands. Changed those `cat` and `chage` tasks to `argv` form so path and user values are passed as arguments safely.
- The consolidated report used `getent group sudo || getent group wheel`, which reports `wheel` only when the `sudo` group lookup fails. Changed it to report both groups independently when present.

## Review Notes
The examples remain Linux/POSIX-focused and assume common local account files and shadow-utils tools. In environments backed by LDAP, SSSD, or other centralized identity providers, `lastlog`, `/etc/shadow`, and `/home`-based SSH key discovery may not provide a complete access review.
