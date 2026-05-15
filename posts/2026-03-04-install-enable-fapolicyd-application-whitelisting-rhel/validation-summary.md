# Validation Summary: How to Install and Enable fapolicyd for Application Whitelisting on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- fapolicyd
- systemd
- rpm/dnf package management
- Linux Audit

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Blocking and allowing applications by using fapolicyd": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/assembly_blocking-and-allowing-applications-using-fapolicyd_security-hardening
- fapolicyd-cli(8) man page mirror: https://www.mankier.com/8/fapolicyd-cli
- fapolicyd.conf(5) man page mirror: https://www.mankier.com/5/fapolicyd.conf

## Issues Found
- The permissive-mode monitoring example used `journalctl -u fapolicyd --since "10 minutes ago" | grep "deny"`. Red Hat's RHEL 9 guidance checks Audit `fanotify` records with `ausearch -ts recent -m fanotify`, so the command was updated to use `ausearch`.
- The enforcement verification step used `fapolicyd-cli --list`, but that command lists rules with rule numbers for troubleshooting; it does not by itself prove enforcement mode is active. The post now checks the `permissive` setting and labels `fapolicyd-cli --list` as a rule-listing command.
- The configuration overview showed specific `nice_val`, `q_size`, and `db_max_size` values as if they were stable defaults. Because these defaults vary by fapolicyd/RHEL package version, the snippet now lists the setting names and meanings without hardcoded version-sensitive values.
- The trust database section said "first 10" while using `head -20`. The comment was corrected to "first 20".
- The trust database update comment said "from RPM"; `fapolicyd-cli --update` notifies the daemon to update the trust database after RPM or trust file changes. The comment was clarified.

## Review Notes
The core installation and service commands are valid for RHEL. The post intentionally stays concise; a future expanded version could add Red Hat's optional audit rule for tracking `/etc/fapolicyd/` changes and a non-root execution test such as copying `/bin/ls` to `/tmp` and confirming it is blocked in enforcing mode.
