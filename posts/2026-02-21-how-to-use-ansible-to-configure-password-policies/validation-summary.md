# Validation Summary: How to Use Ansible to Configure Password Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks and built-in modules
- Linux PAM
- pam_pwquality and libpwquality
- pam_faillock
- pam_pwhistory
- /etc/login.defs and shadow password aging
- chage

## Sources Consulted
- Ansible `ansible.builtin.lineinfile` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.template` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.command` documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Debian `pam_pwquality(8)` manual: https://manpages.debian.org/bookworm/libpam-pwquality/pam_pwquality.8.en.html
- Debian `pwquality.conf(5)` manual: https://manpages.debian.org/testing/libpwquality-common/pwquality.conf.5.en.html
- Arch Linux `pam_faillock(8)` manual: https://man.archlinux.org/man/core/pam/pam_faillock.8.en
- Arch Linux `faillock.conf(5)` manual: https://man.archlinux.org/man/core/pam/faillock.conf.5.en
- Arch Linux `pam_pwhistory(8)` manual: https://man.archlinux.org/man/core/pam/pam_pwhistory.8.en
- Linux `login.defs(5)` manual: https://www.man7.org/linux/man-pages/man5/login.defs.5.html
- Local system manuals for `pam_pwquality(8)`, `faillock.conf(5)`, `pam_faillock(8)`, `pam_pwhistory(8)`, `login.defs(5)`, `shadow(5)`, and `chage(1)`

## Issues Found
- `/etc/login.defs` was described too broadly as controlling password aging and basic settings. Updated the wording to clarify that the relevant aging settings are defaults for newly created local accounts.
- The password aging playbook set `PASS_MIN_LEN` in `/etc/login.defs`. Current shadow-utils `login.defs(5)` documentation does not list `PASS_MIN_LEN` as a supported password aging control, and the post already configures minimum length through `pam_pwquality`. Removed the `pass_min_len` variable and the `PASS_MIN_LEN` task.
- The `faillock.conf` template comments said `audit` audits failed login attempts and `silent` logs to syslog. The Linux-PAM documentation says `audit` logs the user name when the user is not found, and `silent` suppresses informative user-facing messages. Updated those comments.

## Review Notes
- The remaining PAM and pwquality option names checked out against the manuals.
- The RHEL PAM edits are technically plausible, but production RHEL systems often use authselect-managed PAM profiles. A future improvement could mention using the distribution-supported profile management flow instead of editing generated PAM files directly.
