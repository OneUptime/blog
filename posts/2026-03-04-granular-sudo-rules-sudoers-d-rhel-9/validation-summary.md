# Validation Summary: How to Create Granular Sudo Rules in /etc/sudoers.d on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- sudo and sudoers
- `/etc/sudoers.d` drop-in configuration
- `visudo`
- systemd commands (`systemctl`, `journalctl`)
- Linux administrative command paths and permissions

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing sudo access": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-sudo-access_configuring-basic-system-settings
- Sudoers manual, sudo 1.9.15: https://www.sudo.ws/docs/man/1.9.15/sudoers.man/
- Visudo manual, sudo 1.9.14: https://www.sudo.ws/docs/man/1.9.14/visudo.man/
- Local sudo/visudo help and man pages (`sudo -h`, `visudo -h`, `man sudoers`) from sudo 1.9.15p5.
- CentOS Stream 9 iproute RPM spec from Red Hat GitLab, for EL9 `ip`/`ss` install paths: https://gitlab.com/redhat/centos-stream/rpms/iproute/-/raw/c9s/iproute.spec

## Issues Found
- The monitoring and networking examples used `/usr/bin/ss`. On EL9-style systems, `ss` is installed under `/usr/sbin/ss`, so the sudoers rules would not match the intended command path. Updated both examples to `/usr/sbin/ss`.
- The `systemctl status` and `journalctl` examples could invoke a pager when run from a terminal, which is risky in restricted sudo rules because pagers can provide shell escapes. Added `--no-pager` to the affected `systemctl` and `journalctl` command specifications.
- The ordering section said number prefixes control processing order. Sudoers include files are parsed in sorted lexical order, not numeric order. Updated the wording to recommend zero-padded number prefixes for lexical processing order.

## Review Notes
The sudoers snippets were checked with `visudo -c -f -` and parsed successfully. The post correctly describes `#includedir /etc/sudoers.d`, filename restrictions for files containing `.` or ending in `~`, use of `visudo -f`, `visudo -c`, absolute command paths, command aliases, NOPASSWD tags, and the limitations of negated command rules.
