# Validation Summary: How to Check AppArmor Status and Loaded Profiles on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- AppArmor
- AppArmor command-line tools (`aa-status`, `apparmor_status`, `apparmor_parser`, `aa-notify`)
- Linux kernel AppArmor interfaces under `/proc` and `/sys`
- systemd journal and audit logs
- Docker AppArmor profiles

## Sources Consulted
- Ubuntu Server documentation: AppArmor - https://ubuntu.com/server/docs/how-to/security/apparmor/
- Ubuntu manpage: `aa-status` / `apparmor_status` - https://manpages.ubuntu.com/manpages/noble/man8/apparmor_status.8.html
- Ubuntu manpage: `apparmor_parser` - https://manpages.ubuntu.com/manpages/noble/man8/apparmor_parser.8.html
- Ubuntu manpage: `apparmor` - https://manpages.ubuntu.com/manpages/noble/man7/apparmor.7.html
- Ubuntu manpage: `apparmor.d` profile syntax - https://manpages.ubuntu.com/manpages/questing/man5/apparmor.d.5.html
- Ubuntu manpage: `aa-notify` - https://manpages.ubuntu.com/manpages/stonking/man8/aa-notify.8.html
- Docker documentation: AppArmor security profiles for Docker - https://docs.docker.com/engine/security/apparmor/
- Docker CLI reference: `docker inspect` - https://docs.docker.com/reference/cli/docker/inspect/
- Local Ubuntu AppArmor tool help/man output for `aa-status`, `apparmor_status`, and `apparmor_parser`

## Issues Found
- Corrected the explanation that AppArmor "intercepts system calls" to say it mediates access requests through Linux security hooks, matching AppArmor's Linux Security Module model.
- Clarified complain mode behavior. Complain mode logs would-be denials without blocking them, but explicit `deny` rules still deny access.
- Corrected the kernel command-line check. Ubuntu can have AppArmor enabled without explicit `apparmor=1 security=apparmor` parameters, so the post now says those parameters may appear only when configured explicitly.
- Replaced invalid `aa-status --pretty-print` with the supported `aa-status --pretty-json` option.
- Corrected the example `/proc/<PID>/attr/current` confined output to use a full profile-style path such as `/usr/sbin/nginx (enforce)`.
- Corrected the auditd log path from `/var/log/syslog` to `/var/log/audit/audit.log`.
- Replaced `apparmor_parser -p` for syntax validation with `apparmor_parser -Q`, since `-p` preprocesses profiles and `-Q` compiles without loading into the kernel.
- Corrected Docker profile inspection to use `docker inspect --format '{{.AppArmorProfile}}' <container-id>`.
- Removed the incorrect instruction to read `/etc/apparmor.d/docker-default`; Docker generates the default container profile in tmpfs and loads it into the kernel.

## Review Notes
The post is technically relevant and valid after the corrections. Some examples depend on installed packages and local Ubuntu release behavior, so profile names and counts may vary by system.
