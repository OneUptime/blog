# Validation Summary: How to Set User Password Expiry with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.user module
- ansible.builtin.command and ansible.builtin.shell modules
- Linux password aging
- chage
- /etc/shadow
- /etc/login.defs

## Sources Consulted
- Ansible ansible.builtin.user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Linux chage(1) manual page: https://man7.org/linux/man-pages/man1/chage.1.html
- Linux shadow(5) manual page: https://man7.org/linux/man-pages/man5/shadow.5.html
- Linux login.defs(5) manual page: https://man7.org/linux/man-pages/man5/login.defs.5.html
- Local chage --help output from the review environment

## Issues Found
- The user module section omitted current Ansible password aging parameters for warning days and post-expiry account disable days. Added `password_expire_warn` and `password_expire_account_disable` to the example and parameter list, matching current Ansible documentation.
- The account expiry example used `1743465600` while describing March 31, 2025. That timestamp is April 1, 2025 at 00:00:00 UTC, so it was changed to `1743379200`.
- The "alternative" force-password-change example reset a user's password hash with `ansible.builtin.user`, but did not force a password change at next login. Replaced it with another `chage -d 0` example, which is the documented way to set the last password change date to 0.
- The `chage` section described `chage` as required for full password aging control. Current Ansible supports the covered aging settings directly, so the wording was updated to present `chage` as useful for older Ansible versions or when directly invoking the underlying tool.

## Review Notes
- The examples use direct `command` and `shell` calls, so several tasks are not fully idempotent and may report changed on every run unless `changed_when` is set. This is acceptable for the tutorial examples, but production playbooks could improve change reporting.
- `PASS_MIN_LEN` in `/etc/login.defs` is distribution- and PAM-dependent for password quality enforcement; the password aging defaults (`PASS_MAX_DAYS`, `PASS_MIN_DAYS`, and `PASS_WARN_AGE`) are the relevant settings for this article.
