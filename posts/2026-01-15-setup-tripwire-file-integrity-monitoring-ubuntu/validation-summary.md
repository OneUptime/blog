# Validation Summary: How to Set Up Tripwire for File Integrity Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Open Source Tripwire 2.4.3.7
- Tripwire policy and configuration files
- Linux shell commands
- cron
- systemd timers
- mailutils/Postfix email delivery
- rsyslog

## Sources Consulted
- Ubuntu Noble `tripwire(8)` manpage: https://manpages.ubuntu.com/manpages/noble/man8/tripwire.8.html
- Ubuntu Noble `twadmin(8)` manpage: https://manpages.ubuntu.com/manpages/noble/man8/twadmin.8.html
- Ubuntu Noble `twprint(8)` manpage: https://manpages.ubuntu.com/manpages/noble/man8/twprint.8.html
- Ubuntu Noble `twconfig(4)` manpage: https://manpages.ubuntu.com/manpages/noble/man4/twconfig.4.html
- Ubuntu `twpolicy(4)` manpage: https://manpages.ubuntu.com/manpages/jammy/man4/twpolicy.4.html
- Upstream Tripwire Linux policy example: https://github.com/Tripwire/tripwire-open-source/blob/master/policy/twpol-Linux.txt
- Extracted Ubuntu Noble `tripwire` package command help for Tripwire 2.4.3.7.

## Issues Found
- Corrected Tripwire property mask documentation for `d`, `c`, `l`, and `r`, and fixed the `IgnoreNone` and `IgnoreAll` mask examples to match Tripwire's documented policy properties.
- Fixed the optional Apache/Nginx policy examples. They were written as stop points with rule attributes, which is not valid Tripwire stop-point syntax and would exclude those directories instead of showing rules to uncomment.
- Replaced a fragile "latest report" filename example with an `ls -t` lookup, because Tripwire's configured `$(DATE)` report value includes date and time rather than just `YYYYMMDD`.
- Corrected the interactive database update instructions: Tripwire uses ballot boxes where accepted entries keep `x`; entries to reject should have the `x` removed.
- Updated the email setup package command to install both `mailutils` and a sendmail-compatible MTA (`postfix`) for the SENDMAIL method shown in the configuration.
- Removed the misleading SMTP port comment implying SSL support on port 465; Tripwire's configuration documents only the SMTP host and port.
- Replaced the "force an email report" command with Tripwire's documented `--test --email` mode for testing email delivery.
- Corrected the diagnostic database-print command from `twadmin --print-dbfile` to `twprint --print-dbfile`.
- Replaced the non-existent `twadmin --check-polfile` command with a documented `twadmin --create-polfile --no-encryption --polfile /tmp/tw.pol` syntax-validation workflow.

## Review Notes
The post is technically relevant and generally accurate after the fixes. Some monitored paths in the example policy are distribution- or package-dependent, so users may still need to remove or stop-point missing files before database initialization.
