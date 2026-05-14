# Validation Summary: How to Use System-Wide Cron Directories on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Cronie / crond
- anacron and /etc/anacrontab
- System cron directories: /etc/cron.d, /etc/cron.hourly, /etc/cron.daily, /etc/cron.weekly, /etc/cron.monthly
- run-parts
- Bash shell scripts

## Sources Consulted
- Red Hat Enterprise Linux 7 System Administrator's Guide, "Automating System Tasks": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- Red Hat Enterprise Linux 6 Migration Planning Guide, "Cron": https://docs.redhat.com/en/documentation/Red_Hat_Enterprise_Linux/6/html/migration_planning_guide/sect-migration_guide-networking-cron
- Cronie crontab(5) manual page: https://man7.org/linux/man-pages/man5/crontab.5.html
- Cronie anacrontab(5) manual page: https://man7.org/linux/man-pages/man5/anacrontab.5.html
- Local run-parts --help output

## Issues Found
- The /etc/cron.d rules said each line must include the username field. I changed this to each job line, because comments, blank lines, and environment assignments such as SHELL, PATH, and MAILTO do not include a username field.
- The anacron timing explanation said cron.daily runs with a 5-minute delay after START_HOURS_RANGE begins. I updated it to include the configured RANDOM_DELAY of 0 to 45 minutes, which Red Hat's Cronie documentation and anacrontab(5) specify is added to the base delay.

## Review Notes
- The post is broadly accurate for RHEL systems using Cronie. The exact contents of /etc/cron.d/0hourly and /etc/anacrontab can vary by package version and local administrator changes, so the existing "something like" and "typically see" wording is appropriate.
