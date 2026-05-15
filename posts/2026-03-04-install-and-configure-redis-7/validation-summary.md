# Validation Summary: How to Install and Configure Redis 7 on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Redis 7
- DNF modules
- Remi RPM repository
- systemd
- firewalld
- Linux kernel tuning

## Sources Consulted
- Red Hat Enterprise Linux 9.0 Release Notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/9.0_release_notes/Red_Hat_Enterprise_Linux-9-9.0_Release_Notes-en-US.pdf
- Red Hat Enterprise Linux 9.3 Release Notes, Redis 7 module stream: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.3_release_notes/new-features
- Redis official Linux installation documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/archive/install-redis/install-redis-on-linux/
- Redis 7.2 example configuration: https://raw.githubusercontent.com/redis/redis/7.2/redis.conf
- Redis administration documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/admin/
- Redis latency documentation for Transparent Huge Pages: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/
- Redis CLI documentation: https://redis.io/docs/latest/develop/tools/cli/
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd
- Remi RPM repository Redis 8.6 note: https://blog.remirepo.net/post/2026/01/23/Redis-version-8.6

## Issues Found
- The installation step used `sudo dnf install -y redis` as the primary Redis installation command. On RHEL 9, Red Hat documents Redis 6.2 as the initial Redis Application Stream, so that command does not reliably install Redis 7. Changed it to `sudo dnf module install -y redis:7`, which Red Hat documents for the Redis 7 stream.
- The Remi repository option was described as "the latest version" while the command enabled `redis:remi-7.2`. Remi currently also provides newer Redis streams, so that wording was inaccurate. Changed it to describe the command as installing Redis 7.2 from Remi.

## Review Notes
- The Redis configuration directives, Redis CLI examples, systemd service name, firewalld commands, `vm.overcommit_memory` tuning, `somaxconn` tuning, and Transparent Huge Pages command are technically valid for the covered environment.
- The Transparent Huge Pages command is runtime-only and will not persist across reboot unless configured through a systemd unit, tuned profile, kernel command line, or another boot-time mechanism. The post remains correct for a manual tuning step, but persistence could be clarified in a future update.
