# Validation Summary: How to Roll Back Package Updates Using DNF History on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- DNF package manager
- DNF history, undo, and rollback
- RPM package transactions
- LVM snapshots

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing software with the DNF tool, Chapter 9, Handling package management history: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/managing_software_with_the_dnf_tool
- DNF Command Reference, History command: https://dnf.readthedocs.io/en/stable/command_ref.html#history-command
- DNF Command Reference, Downgrade command: https://dnf.readthedocs.io/en/stable/command_ref.html#downgrade-command
- Red Hat Customer Portal: How to use yum/dnf to downgrade or rollback some package updates: https://access.redhat.com/solutions/29617
- Red Hat Customer Portal search result for DNF history database files under `/var/lib/dnf/`, including `history.sqlite`: https://access.redhat.com/solutions/6998286

## Issues Found
- The post used `dnf history list --since="7 days ago"`, but the DNF history command does not document a `--since` option. Replaced it with a supported transaction range example: `dnf history list last-6..last`.
- The post described the history database as being exactly at `/var/lib/dnf/history/`. Red Hat documentation describes the history data under `/var/lib/dnf/history/`, while DNF 4 systems commonly use `/var/lib/dnf/history.sqlite`. Updated the wording to avoid over-specifying a single path.
- The sample transaction output showed a kernel package as both `Upgrade` and `Install`. Kernel packages are install-only packages in normal RHEL updates, so the sample now shows an install-only kernel package entry.
- The rollback section did not include Red Hat's support caveat that downgrading RHEL system packages with `dnf history undo` or `dnf history rollback` is unsupported, especially for packages such as `selinux`, `selinux-policy-*`, `kernel`, `glibc`, and related dependencies. Added the caveat near the rollback warning.
- The tips section advised cleaning up old history but only showed a command to view old entries. Changed the wording to "Review old history periodically" to match the command shown.

## Review Notes
The main DNF history workflow is accurate for RHEL 9: `dnf history`, `dnf history list <package_name>`, `dnf history info <transaction_id>`, `dnf history undo <transaction_id>`, and `dnf history rollback <transaction_id>` are documented. Rollbacks remain best suited for small, package-level changes and should not be treated as a supported minor-release downgrade mechanism.
