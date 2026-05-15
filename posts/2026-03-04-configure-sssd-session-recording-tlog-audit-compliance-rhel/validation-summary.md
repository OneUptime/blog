# Validation Summary: How to Configure SSSD Session Recording with tlog for Audit Compliance on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- SSSD
- tlog
- systemd journal
- Cockpit / RHEL web console
- authselect

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Recording sessions: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/recording_sessions/index
- tlog upstream documentation: https://github.com/Scribery/tlog
- tlog-rec-session.conf manual page: https://manpages.debian.org/testing/tlog/tlog-rec-session.conf.5.en.html

## Issues Found
- The installation command installed only `tlog`, but Red Hat documents SSSD as a required component for SSSD-managed session recording. Updated the command to install both `tlog` and `sssd`.
- The SSSD CLI configuration omitted the Red Hat-documented `authselect select sssd with-files-domain` step needed to enable the SSSD profile. Added the command before restarting SSSD.
- The journal listing example searched for `TLOG_REC_SESSION`, which is not a documented tlog journal field. Replaced it with Red Hat's documented `_COMM=tlog-rec-sessio` filter and a verbose journal command that extracts the documented `TLOG_REC` field.
- The recording count example used `TLOG_REC=*`, which is not the documented Red Hat listing approach. Replaced it with a count based on `_COMM=tlog-rec-sessio`.
- The final claim said tlog records what users typed and saw, but tlog-rec-session disables input logging by default to avoid capturing passwords. Updated the wording to clarify that typed input is recorded only if input logging is enabled.

## Review Notes
- The `tlog-rec-session.conf` JSON fields shown in the post are valid. The default `log.input` behavior remains disabled unless explicitly configured.
- Red Hat notes that journal-backed recordings can be lost on reboot if the system journal is volatile; persistent journal storage or export should be considered for production audit retention.
