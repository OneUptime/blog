# Validation Summary: How to Use Ansible to Configure Timezone Settings

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- community.general.timezone
- ansible.builtin.command
- ansible.builtin.lineinfile
- ansible.builtin.systemd_service
- Linux timezone and RTC configuration
- timedatectl
- hwclock
- PHP configuration
- MySQL/MariaDB configuration
- PostgreSQL configuration
- Docker containers
- Java timezone configuration

## Sources Consulted
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.lineinfile module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- systemd timedatectl manual: https://www.freedesktop.org/software/systemd/man/latest/timedatectl.html
- Linux time(7) manual: https://man7.org/linux/man-pages/man7/time.7.html
- PHP date/time runtime configuration documentation: https://www.php.net/manual/en/datetime.configuration.php
- MySQL 8.4 server time zone support documentation: https://dev.mysql.com/doc/refman/8.4/en/time-zone-support.html
- PostgreSQL date/time configuration documentation: https://www.postgresql.org/docs/current/datetime-config-files.html
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Oracle Java TimeZone API documentation: https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/TimeZone.html

## Issues Found
- The post described `community.general.timezone` as a built-in Ansible module. This module is in the `community.general` collection and is not included in `ansible-core`, so the text now calls out the collection requirement and installation command.
- The post used `ansible.builtin.systemd`. Official Ansible documentation says this is an alias retained for backward compatibility and recommends `ansible.builtin.systemd_service`, so the examples now use the current FQCN.
- The regional playbook restarted a service named `cron`, which is Debian/Ubuntu-specific and does not match Red Hat-family systems where the daemon is commonly `crond`. The example now defines `cron_service_name` based on `ansible_os_family`.
- The hardware clock section said the system clock and hardware clock need to agree on whether they store UTC or local time. Linux system time is represented as a timezone-independent Unix timestamp; the RTC setting controls whether the hardware clock is interpreted as UTC or local time. The explanation was corrected.
- The UTC recommendation included an exception that implied user-facing application servers should use local OS time when application-level local display is used. That was corrected to recommend keeping the OS on UTC and handling local display in the application.

## Review Notes
- The PHP, MySQL/MariaDB, and PostgreSQL file paths and service names are version- and distribution-specific examples. They are technically valid for the named versions/layouts shown, but a production role should usually make them variables or derive them from facts.
- The `community.general.timezone` documentation notes that `hwclock` may fail in some virtual environments and that Ubuntu 24.04/Debian 13 may require `util-linux-extra` for the `hwclock` command.
- The audit playbook uses `timedatectl`, so it is aimed at systemd-based Linux hosts. Non-systemd hosts would need a different audit command.
