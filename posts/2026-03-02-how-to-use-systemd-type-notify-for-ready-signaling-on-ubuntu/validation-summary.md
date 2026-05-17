# Validation Summary: How to Use systemd Type=notify for Ready Signaling on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- systemd (Type=notify, sd_notify protocol)
- systemd unit files (.service)
- systemd watchdog (WatchdogSec, WATCHDOG_USEC)
- Python (socket, signal, os modules)
- C / libsystemd (sd-daemon.h, sd_notify function)
- systemctl and journalctl CLI tools
- Ubuntu Linux

## Sources Consulted
- systemd.service(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.service.html
- sd_notify(3) man page — https://www.freedesktop.org/software/systemd/man/sd_notify.html
- systemd.exec(5) man page — https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemctl(1) man page — https://www.freedesktop.org/software/systemd/man/systemctl.html
- daemon(7) man page (for NOTIFY_SOCKET and abstract socket conventions) — https://www.freedesktop.org/software/systemd/man/daemon.html
- Python `socket` module documentation — https://docs.python.org/3/library/socket.html
- sdnotify PyPI package — https://pypi.org/project/sdnotify/

## Issues Found
No technical issues found.

Verified specifically:
- `Type=notify` semantics and the requirement that READY=1 marks the service active (matches systemd.service(5)).
- The five protocol messages listed (READY=1, STOPPING=1, STATUS=, WATCHDOG=1, MAINPID=) are all valid sd_notify state strings per sd_notify(3).
- Abstract socket handling: replacing a leading `@` with `\0` is the correct Linux abstract socket convention used by systemd's NOTIFY_SOCKET.
- Python `socket.socket(AF_UNIX, SOCK_DGRAM)` with `sendto(message.encode(), notify_socket)` is the correct raw-socket approach.
- C signature `sd_notify(int unset_environment, const char *state)` and the `<systemd/sd-daemon.h>` include path are correct.
- `pkg-config --cflags --libs libsystemd` is the canonical way to link against libsystemd.
- WATCHDOG_USEC is in microseconds; `int(usec) / 2_000_000` correctly yields half the interval in seconds (recommended pinging cadence).
- `TimeoutStartSec`, `TimeoutStopSec`, `Restart=on-failure`, `RestartSec`, `NotifyAccess=all`, `WatchdogSec`, and `EnvironmentFile=` are all valid systemd unit directives.
- `systemctl list-dependencies <unit> --after` is a valid invocation per systemctl(1).
- `systemd-analyze blame` is a valid subcommand.

## Review Notes
- The `sdnotify` PyPI package is mentioned but the example uses the raw socket approach; either is fine and the post correctly notes the choice.
- The post does not mention `Type=notify-reload` (added in systemd 253), which can be useful for services that signal reload completion via `RELOADING=1`/`READY=1`. Not an error — just outside the post's scope.
- The Python `STOPPING=1` example calls `sys.exit(0)` from a signal handler, which is acceptable but conventionally one would set a flag and let the main loop exit. Not a technical error.
- `NotifyAccess=all` is correct but loosens security; `NotifyAccess=main` (the default) or `NotifyAccess=exec` are tighter alternatives the post could mention. Not incorrect as written.
