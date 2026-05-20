# Validation Summary: How to Debug AppArmor Denials in the System Log on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- AppArmor
- Linux audit logging and auditd
- systemd journal and journalctl
- AppArmor command-line tools: aa-status, aa-notify, aa-logprof, aa-complain, aa-enforce, apparmor_parser

## Sources Consulted
- Ubuntu AppArmor server documentation: https://ubuntu.com/server/docs/how-to/security/apparmor/
- AppArmor monitoring and logging documentation: https://apparmor-documentation-c38b15.gitlab.io/documentation/getting-started/monitoring-and-logging/
- Ubuntu manpage for aa-logprof: https://manpages.ubuntu.com/manpages/noble/man8/aa-logprof.8.html
- Ubuntu manpage for aa-notify: https://manpages.ubuntu.com/manpages/noble/man8/aa-notify.8.html
- Ubuntu manpage for aa-status / apparmor_status: https://manpages.ubuntu.com/manpages/focal/man8/apparmor_status.8.html
- Ubuntu manpage for aa-complain: https://manpages.ubuntu.com/manpages/bionic/man8/aa-complain.8.html
- Ubuntu manpage for aa-enforce: https://manpages.ubuntu.com/manpages/jammy/man8/aa-enforce.8.html
- Ubuntu manpage for apparmor.d profile syntax: https://manpages.ubuntu.com/manpages/noble/man5/apparmor.d.5.html
- Local apparmor_parser 4.0.1 --help output for parser flags
- ausearch manpage: https://man7.org/linux/man-pages/man8/ausearch.8.html
- Ubuntu/AppArmor bug reference for ausearch AVC filtering behavior: https://bugs.launchpad.net/bugs/1117804

## Issues Found
- The post called `journalctl -k` the most reliable place to check AppArmor denials. AppArmor documentation notes denials may appear in syslog, auditd, the kernel log, or journald depending on the system. Changed the wording to call it a good first place to check.
- The auditd examples used `ausearch -m AVC`, which is known to be unreliable for AppArmor denial records on Ubuntu. Replaced the main audit-log search with a direct grep of `/var/log/audit/audit.log` and removed the AVC message-type filter from the time-range `ausearch` example.
- The complain-mode explanation said denials are logged but not enforced. The `aa-complain` manpage notes explicit `deny` rules are still enforced in complain mode. Updated the explanation and softened the diagnostic conclusion.
- The `Px` exec-rule comment implied execution always transitions to the helper's profile. AppArmor profile syntax documentation says `Px` requires a matching discrete profile and denies execution if none exists. Updated the comment.
- The syntax-check command used `apparmor_parser -p`, which dumps the preprocessed profile. Replaced it with `apparmor_parser -Q`, which parses the profile without loading it into the kernel.

## Review Notes
The remaining commands and profile snippets are consistent with current Ubuntu/AppArmor documentation. Some examples are intentionally simplified, such as using grep against journal output instead of journalctl field filters, but they are technically valid for the tutorial's scope.
