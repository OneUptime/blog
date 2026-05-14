# Validation Summary: How to Troubleshoot Application Denials Caused by fapolicyd on RHEL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux
- fapolicyd
- systemd
- Linux Audit / ausearch
- RPM package database

## Sources Consulted
- Red Hat Enterprise Linux documentation: Blocking and allowing applications by using fapolicyd: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/security_hardening/blocking-and-allowing-applications-by-using-fapolicyd
- fapolicyd-cli(8) manual page: https://www.mankier.com/8/fapolicyd-cli
- fapolicyd.conf(5) manual page: https://www.mankier.com/5/fapolicyd.conf
- fapolicyd(8) manual page: https://www.mankier.com/8/fapolicyd

## Issues Found
- The post stated that fapolicyd logs all deny decisions to the system journal. Red Hat documentation shows the default rules generate audit events for denials and recommends checking them with `ausearch -ts recent -m fanotify`. I changed the logging section to use audit logs for denials and kept `journalctl` only for service messages.
- The post used `journalctl` examples to inspect denial details. I changed those examples to `ausearch -ts recent -m fanotify`, matching Red Hat's documented troubleshooting flow.
- The post recommended only `fapolicyd-cli --update` for an updated trusted binary. Red Hat documentation notes that changed trusted files need `fapolicyd-cli --file update` to refresh their size and checksum, followed by `fapolicyd-cli --update` to update the daemon database. I updated that command sequence.
- The shared-library grep used `grep ".so"`, where `.` is a regular-expression wildcard. I changed it to `grep '\.so'` so it matches the literal file-extension pattern.

## Review Notes
The remaining commands are technically valid for the documented fapolicyd workflow. In a future expanded guide, adding `fapolicyd --debug-deny` and `fapolicyd-cli --list` examples would make rule-level troubleshooting more complete, but the current post is accurate after the fixes above.
