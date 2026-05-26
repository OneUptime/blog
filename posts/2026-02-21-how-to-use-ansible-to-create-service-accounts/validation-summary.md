# Validation Summary: How to Use Ansible to Create Service Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- `ansible.builtin.user`, `ansible.builtin.group`, `ansible.builtin.file`, `ansible.builtin.copy`, and `ansible.builtin.systemd`
- Linux service accounts, system users, shells, and UID ranges
- systemd service units and sandboxing directives
- logrotate
- cron access controls

## Sources Consulted
- Ansible `ansible.builtin.user` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/user_module.html
- Ansible `ansible.builtin.group` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/group_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- systemd.exec manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- Linux `useradd(8)` manual: https://man7.org/linux/man-pages/man8/useradd.8.html
- Linux `logrotate.conf(5)` manual: https://man7.org/linux/man-pages/man5/logrotate.conf.5.html
- Linux `crontab(1)` manual: https://man7.org/linux/man-pages/man1/crontab.1.html

## Issues Found
- The service-account UID range was stated as `100-999`, which is common on some distributions but not universally correct. Changed it to refer to the system range from `/etc/login.defs`.
- The complete provisioning playbook was described as handling the entire lifecycle, but the example does not enable or start the systemd service and does not deploy the application binary. Adjusted the wording to match what the playbook actually does.
- The backup service account explanation said a real shell is needed because it runs backup scripts. A service account can run scripts from systemd or cron with `nologin`; a real shell is only justified for SSH command execution or shell-based workflows. Updated the explanation.
- The cron hardening comment said it restricted cron access. `cron.deny` restricts use of the `crontab` command, not execution of existing cron jobs. Updated the comment to say it restricts use of crontab.

## Review Notes
The YAML snippets were parsed successfully with PyYAML. `ansible.builtin.systemd` is still valid as a backward-compatible alias for `ansible.builtin.systemd_service`, though future posts could use the newer module name for clarity.
