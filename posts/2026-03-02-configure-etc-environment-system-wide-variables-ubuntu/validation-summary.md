# Validation Summary: How to Configure /etc/environment for System-Wide Variables on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux environment variables
- `/etc/environment`
- Linux-PAM `pam_env.so`
- systemd service environment configuration
- systemd `environment.d`
- Locale configuration
- apt proxy configuration
- Shell profile files

## Sources Consulted
- Linux-PAM `pam_env(8)` manual: https://man7.org/linux/man-pages/man8/pam_env.8.html
- Linux-PAM `pam_env.conf(5)` local manual page
- Linux `environ(7)` local manual page
- systemd `systemd.exec(5)` manual: https://man7.org/linux/man-pages/man5/systemd.exec.5.html
- systemd `environment.d(5)` manual: https://man7.org/linux/man-pages/man5/environment.d.5.html
- systemd `systemd-system.conf(5)` manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-system.conf.html
- Ubuntu `update-locale(8)` manual: https://manpages.ubuntu.com/manpages/bionic/man8/update-locale.8.html
- Local `/etc/pam.d/cron` and `/etc/pam.d/common-session` examples from the review environment
- APT `apt.conf(5)` local manual page

## Issues Found
- The post described `/etc/environment` as applying to all users, all shells, and services. I narrowed this to PAM-authenticated sessions and changed the description to avoid implying that systemd system services inherit it by default.
- The post said cron jobs do not receive variables from `/etc/environment`. On Ubuntu, cron is commonly configured with `pam_env.so`, so I changed this to explain that cron may read `/etc/environment` through PAM but job-specific variables should be set in the crontab or wrapper script for portability.
- The locale section said `localectl set-locale` updates `/etc/locale.gen` and `/etc/default/locale`. I changed the Ubuntu example to `update-locale LANG=en_US.UTF-8`, which updates `/etc/default/locale`, and left `localectl` as a systemd-localed option where applicable.
- The debugging section used a `strace` attachment to an existing `sshd` process as a check for PAM reading `/etc/environment`. That is unreliable for normal use, so I replaced it with a direct search of PAM stacks for `pam_env.so`.
- The PAM configuration example used `user_readenv=1 envfile=/etc/environment`. Current Linux-PAM disables user environment files by default and marks that functionality deprecated, so I replaced the example with typical `pam_env.so` lines and added a caution about `user_readenv=1`.
- The `/etc/environment.d/` section claimed the drop-ins affect systemd service sessions and are useful for both user sessions and system services. systemd documents `environment.d` as feeding the systemd user manager, not PID 1 system services, so I corrected the scope and pointed system services back to `Environment=`, `EnvironmentFile=`, and `DefaultEnvironment=`.

## Review Notes
The remaining examples are syntactically valid for the described configuration files. `/etc/environment` parsing differs from shell parsing and from systemd `EnvironmentFile=` parsing, so future revisions could add a short warning that manually sourcing `/etc/environment` is only a convenience for simple shell-compatible assignments, not a perfect simulation of PAM parsing.
