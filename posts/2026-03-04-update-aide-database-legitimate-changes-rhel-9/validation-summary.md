# Validation Summary: How to Update the AIDE Database After Legitimate System Changes on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- AIDE
- DNF
- Bash
- cron/log rotation considerations

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Checking integrity with AIDE": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/checking-integrity-with-aide_security-hardening
- AIDE upstream manual: https://aide.github.io/doc/
- AIDE 0.16.2 upstream `aide(1)` man page source: https://raw.githubusercontent.com/aide/aide/v0.16.2/doc/aide.1.in
- AIDE current `aide(1)` man page reference: https://www.mankier.com/1/aide
- AIDE current `aide.conf(5)` man page reference: https://www.mankier.com/5/aide.conf
- Red Hat Enterprise Linux 9 DNF history documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF command reference, History Command: https://dnf.readthedocs.io/en/stable/command_ref.html#history-command

## Issues Found
- The workflow diagram archived the old database after copying `aide.db.new.gz` over `aide.db.gz`, which would archive the newly activated baseline instead of the previous baseline. Reordered the workflow so the current database is archived before replacement.
- The post claimed that AIDE does not support partial database updates directly. AIDE 0.16.2 documents `--limit` for limiting checks and updates to entries matching a regex while leaving other entries unchecked and unchanged. Rewrote the partial update section to show `sudo aide --update --limit /etc`, while keeping the warning about not using a database generated from a reduced temporary config as a full baseline.
- The automation script wrote logs under `/var/log/aide` but only created `/var/lib/aide/archive`. Added `mkdir -p "$(dirname "${LOGFILE}")"` so the script can create the log file reliably if the log directory does not already exist.

## Review Notes
- Red Hat's RHEL 9 documentation confirms that `aide --update` creates `/var/lib/aide/aide.db.new.gz` and that the `.new` substring must be removed before integrity checks use the updated database. The post uses `cp` instead of Red Hat's shown `mv`; this is operationally valid, though it leaves the `.new` file behind.
- The `dnf history info last` verification command is consistent with RHEL's documented `dnf history info <transaction_id>` pattern and DNF's accepted transaction selector behavior.
- AIDE reports non-zero exit codes when differences are found, so a clean `aide --check` returning exit code 0 is correct.
