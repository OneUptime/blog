# Validation Summary: How to Use Ansible to Enforce Password Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Linux PAM
- libpwquality and pam_pwquality
- pam_pwhistory and pam_unix
- shadow-utils login.defs and chage
- pam_faillock and authselect

## Sources Consulted
- Ansible `ansible.builtin.template` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible `ansible.builtin.lineinfile` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible `ansible.builtin.apt` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible `ansible.builtin.yum` module documentation: https://docs.ansible.com/ansible/9/collections/ansible/builtin/yum_module.html
- Linux-PAM `pam_unix(8)` manual: https://man7.org/linux/man-pages/man8/pam_unix.8.html
- Linux-PAM `pam_pwhistory(8)` manual: https://www.man7.org/linux/man-pages/man8/pam_pwhistory.8.html
- Ubuntu `pam_pwquality(8)` manual: https://manpages.ubuntu.com/manpages/jammy/man8/pam_pwquality.8.html
- `login.defs(5)` shadow-utils manual: https://www.mankier.com/5/login.defs
- `faillock.conf(5)` manual: https://www.mankier.com/5/faillock.conf
- Red Hat Enterprise Linux authselect documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_authentication_and_authorization_in_rhel/configuring-user-authentication-using-authselect_configuring-authentication-and-authorization-in-rhel
- Local `chage --help` output for `--maxdays`, `--mindays`, `--warndays`, and `-l` options.

## Issues Found
- The aging playbook configured `PASS_MIN_LEN` in `/etc/login.defs`. This is not an aging setting and is not the correct enforcement point on PAM-based systems where `pam_pwquality` handles password length. Removed the `pass_min_len` variable and the `PASS_MIN_LEN` task.
- The password history example used `pam_unix.so remember=`, but current Linux-PAM documentation says `pam_pwhistory` should be used instead. Replaced the Debian/Ubuntu and RHEL/CentOS examples with `pam_pwhistory.so remember={{ password_remember }} use_authtok` inserted before `pam_unix.so`.
- The RHEL 8+ lockout example only wrote `/etc/security/faillock.conf`, which configures `pam_faillock` defaults but does not enable the PAM stack. Added an authselect check and `authselect enable-feature with-faillock` task before writing the faillock configuration.

## Review Notes
The YAML snippets were parsed successfully after normalizing Jinja expressions. `ansible` is not installed in this environment, so full `ansible-playbook --syntax-check` validation was not available.
