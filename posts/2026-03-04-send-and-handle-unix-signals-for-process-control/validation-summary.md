# Validation Summary: How to Send and Handle Unix Signals for Process Control on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL/Linux signals
- Linux process management
- Bash signal traps
- Python signal handling
- systemd service reloads
- strace signal tracing

## Sources Consulted
- Linux signal(7) manual: https://man7.org/linux/man-pages/man7/signal.7.html
- POSIX/Linux kill(1) manual: https://man7.org/linux/man-pages/man1/kill.1p.html
- killall(1) local manual page from psmisc
- pkill(1) local manual page from procps-ng
- GNU Bash Reference Manual, Signals and trap builtin: https://www.gnu.org/software/bash/manual/html_node/Signals.html
- Python signal module documentation: https://docs.python.org/3/library/signal.html
- strace(1) local manual page
- systemctl documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd.service ExecReload documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html

## Issues Found
- The `systemctl reload nginx` comment said it "does the same thing" as sending `SIGHUP` directly. `systemctl reload` asks the service manager to run the unit's configured reload action, which may use `SIGHUP` but is not guaranteed to be identical for every service. Changed the comment to say it uses the service's configured reload action.
- The `strace` example used `-e trace=signal`. Current `strace` documentation marks category names without a leading percent sign as deprecated. Updated it to `-e trace=%signal`.

## Review Notes
The signal numbers shown match the common Linux/RHEL architecture values used on x86 and ARM. Signal numbers can vary on some less common architectures, so future revisions could mention using `kill -l` to list values on the target system.
