# Validation Summary: How to Use Python systemd Integration on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Python 3
- systemd (sd_notify, journal, watchdog)
- systemd-python library (PyPI: `systemd-python`, Ubuntu: `python3-systemd`)
- Ubuntu service units (`.service` files)
- journalctl CLI

## Sources Consulted
- systemd-python upstream source and docs: https://github.com/systemd/python-systemd
- `JournalHandler` implementation (fields emitted: PRIORITY, LOGGER, THREAD_NAME, PROCESS_NAME, CODE_FILE, CODE_LINE, CODE_FUNC): https://github.com/systemd/python-systemd/blob/main/systemd/journal.py
- sd_notify(3) manpage (READY=1, STATUS=, STOPPING=1, WATCHDOG=1, WATCHDOG_USEC): https://www.freedesktop.org/software/systemd/man/sd_notify.html
- systemd.service(5) manpage (Type=notify, WatchdogSec=, Restart=on-watchdog, TimeoutStartSec=): https://www.freedesktop.org/software/systemd/man/systemd.service.html
- journalctl(1) manpage (`-u`, `-f`, `-p`, field matches): https://www.freedesktop.org/software/systemd/man/journalctl.html
- sd-journal(3) reader API semantics (sd_journal_seek_tail, sd_journal_previous, sd_journal_next): https://www.freedesktop.org/software/systemd/man/sd-journal.html
- Ubuntu package `python3-systemd`: https://packages.ubuntu.com/search?keywords=python3-systemd

## Issues Found
- **Incorrect journal field name** in the `journalctl` filter example. The post referenced `journalctl PYTHON_MODULE=app`, but `python-systemd`'s `JournalHandler` does not emit a `PYTHON_MODULE` field. The handler emits `LOGGER` (the logger's `name`). Changed the command to `journalctl LOGGER=app` and updated the surrounding comment accordingly.
- **Broken Reader pagination** in the "Reading the Journal from Python" example. The code did `seek_tail()` + `get_previous()` and then `for entry in reader:` which calls `get_next()` and yields zero further entries because the cursor is already at the tail. Rewrote the example to walk backwards with `get_previous()` in a loop to collect the last 10 entries, then print in chronological order. Also dropped the unused `from systemd import journal` import.

## Review Notes
- The `extra={...}` pattern shown for adding structured fields works because `python-systemd`'s `JournalHandler` promotes any uppercase keys from `record.__dict__` into journal fields. The phrasing "Pass them as keyword arguments to the log call" is slightly loose (they are passed via the standard logging `extra` dict, not as direct `**kwargs` to `log.info`) but is technically accurate since `extra=` is itself a keyword argument; left as-is to preserve the author's voice.
- `WATCHDOG_USEC` semantics, half-interval pet cadence, and `Restart=on-watchdog` are all consistent with the sd_notify(3) and systemd.service(5) manpages.
- The `python3-systemd` package on current Ubuntu releases (22.04+, 24.04, 24.10) is correctly named and is the recommended install method since it links against the system's libsystemd.
- Modern systemd defaults `StandardOutput=` to `journal` already, so the closing recommendation to set it explicitly is harmless but not strictly required. Left as-is.
- None of the code samples rely on deprecated APIs.
