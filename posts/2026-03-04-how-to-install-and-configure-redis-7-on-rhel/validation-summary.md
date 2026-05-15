# Validation Summary: How to Install and Configure Redis 7 on RHEL

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Red Hat Enterprise Linux
- Redis 7
- DNF module streams
- Redis configuration
- Redis ACLs
- Redis persistence with RDB and AOF
- Linux kernel memory tuning
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9.3 Release Notes, Redis 7 AppStream module: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.3_release_notes/new-features
- Redis Open Source RPM installation documentation: https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/rpm/
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/security/acl/
- Redis ACL SAVE command documentation: https://redis.io/docs/latest/commands/acl-save/
- Redis persistence documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- Redis administration documentation for Linux memory settings: https://redis.io/docs/latest/operate/oss_and_stack/management/admin/
- Redis latency documentation for Transparent Huge Pages: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/latency/

## Issues Found
- The installation commands used the Remi repository and a RHEL 9-specific repository package even though RHEL 9.3 and later provide Redis 7 as the official `redis:7` AppStream module. Replaced the Remi commands with `sudo dnf -y module install redis:7`.
- The ACL example opened an unauthenticated `redis-cli` session after the post configured `requirepass`, which would result in `NOAUTH` errors. Updated the command to use `redis-cli -a your-strong-password-here`.
- The ACL example used `ACL SAVE` without configuring Redis to use an external ACL file. Updated it to use `CONFIG REWRITE`, which Redis documents for persisting users stored directly in `redis.conf`.
- The firewall section implied that opening port 6379 was enough for remote access, but the sample configuration binds Redis to `127.0.0.1`. Added a note to update `bind` to a reachable private interface before opening the firewall port.

## Review Notes
The post is now accurate for RHEL 9.3 and later. Users on earlier RHEL 9 minor releases may need to update AppStream availability or use another supported repository path.
