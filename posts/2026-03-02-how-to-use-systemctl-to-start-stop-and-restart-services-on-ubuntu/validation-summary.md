# Validation Summary: How to Use systemctl to Start, Stop, and Restart Services on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- systemd (init system and service manager)
- systemctl (command-line interface to systemd)
- journalctl (querying systemd's journal)
- Ubuntu Linux
- Unit files, drop-ins, and targets

## Sources Consulted
- systemctl(1) manpage (systemd upstream documentation): https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd.unit(5) and systemd.service(5) manpages: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.resource-control(5) for set-property semantics
- journalctl(1) manpage: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- Local `man systemctl` on a current Ubuntu system to verify flag availability

## Issues Found

1. **`systemctl set-property` permanence semantics were inverted.** The original text claimed `set-property` was temporary by default and that a `--permanent` flag would make changes persist. This is backwards — and `--permanent` is not a valid flag. Per the systemctl manpage: "The changes are applied immediately, and stored on disk for future boots, unless `--runtime` is passed, in which case the settings only apply until the next reboot." Updated the example to describe the default behavior accurately and to use `--runtime` for the temporary case.

2. **`systemctl edit nginx.service --no-editor` is not a valid invocation.** `--no-editor` is not an option for `systemctl edit`; the supported flags are `--system`, `--user`, `--global`, `--drop-in=`, `--full`, `--force`, and `--runtime`. `systemctl edit` always opens an editor on temporary files. The intent of the line was to view existing overrides, which is already accomplished by `systemctl cat` (shown directly above it). Replaced the invalid command with `ls /etc/systemd/system/<unit>.d/` to list drop-in files on disk, which complements `systemctl cat`.

## Review Notes

- The `systemctl is-active` description simplifies the possible states to "active" / "inactive". In practice, units can also report `activating`, `deactivating`, `reloading`, `failed`, or `maintenance`. The simplification is acceptable in a getting-started context, and the exit-code description is accurate.
- The description of `reload` "usually sending SIGHUP" is a useful simplification — strictly, the signal sent depends on the unit's `ExecReload=` directive (which may run any arbitrary command, not just send a signal).
- The `systemctl stop` description ("sends SIGTERM, waits, then SIGKILL if it does not stop") accurately reflects default behavior with `KillSignal=SIGTERM`, `TimeoutStopSec=`, and `SendSIGKILL=yes` defaults.
- All other commands and flags (`enable --now`, `disable --now`, `mask`/`unmask`, `daemon-reload`, `list-units`, `list-dependencies`, `try-restart`, `reload-or-restart`, `kill`, `isolate`, `set-default`, `reset-failed`, `show --property`, `cat`) verified against the current systemctl manpage and behave as described.
