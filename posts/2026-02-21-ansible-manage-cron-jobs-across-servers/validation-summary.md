# Validation Summary: How to Use Ansible to Manage Cron Jobs Across Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.cron
- ansible.builtin.template
- ansible.builtin.copy
- Linux cron and /etc/cron.d
- crontab
- flock
- GNU timeout

## Sources Consulted
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Linux crontab(5) manual page: https://man7.org/linux/man-pages/man5/crontab.5.html
- Local util-linux flock help output (`flock --help`)
- Local GNU coreutils timeout help output (`timeout --help`)
- Local crontab help output (`crontab -h`)

## Issues Found
- The cron wrapper stored the remaining command arguments in a string and then expanded that string unquoted with `timeout`. This would work for simple commands but could break arguments containing spaces or shell metacharacters. Changed the wrapper to call `timeout "${TIMEOUT}m" "$@"`, preserving the original argument boundaries.
- The second locked cron job used `user: www-data`, but the wrapper writes lock and log files under `/var/lock/cron` and `/var/log/cron-jobs`. As written, that can fail for an unprivileged user if those directories do not already exist with suitable permissions. Changed the example job to run as `root`, matching the wrapper's filesystem assumptions.
- The production tip said omitting `name` would create duplicate entries on every run. Current Ansible requires `name` for `ansible.builtin.cron`, so the more accurate guidance is to use a stable, unique name because Ansible uses it to find, update, and remove managed entries. Updated the wording.

## Review Notes
- The Ansible cron examples use current `ansible.builtin.cron` parameters, including `name`, `minute`, `hour`, `weekday`, `job`, `user`, `state`, and `env`.
- The `/etc/cron.d` template correctly includes the required user field between the schedule and command.
- The audit playbook is suitable as an illustrative example, but production audits may need extra handling for systems where `crontab -l -u <user>` is restricted by policy.
