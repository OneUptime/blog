# Validation Summary: How to Set Up systemd Socket Activation for On-Demand Services on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd socket units
- systemd service units
- systemctl
- Python socket programming
- netcat

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Working with systemd unit files: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_systemd_unit_files_to_customize_and_optimize_your_system/assembly_working-with-systemd-unit-files_working-with-systemd
- systemd.socket official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.socket.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.exec official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- sd_listen_fds official manual: https://www.freedesktop.org/software/systemd/man/latest/sd_listen_fds.html
- Python socket module documentation: https://docs.python.org/3/library/socket.html

## Issues Found
- The introduction said systemd "hands off the socket" without distinguishing between the listening socket passed with `Accept=false` and accepted connection sockets passed with `Accept=true`. Updated the wording to say systemd passes the socket file descriptor.
- The `ListenStream=8080` example creates an IPv6 listening socket by default according to `systemd.socket`, while the Python sample wraps the fd as `socket.AF_INET`. Changed it to `ListenStream=0.0.0.0:8080` and updated the test command to `nc 127.0.0.1 8080` so the socket family matches the code.
- The Python sample checked `LISTEN_FDS` but not `LISTEN_PID`. Added a `LISTEN_PID` check to match the protocol described by `sd_listen_fds`.
- The `Accept=true` section referenced `/usr/local/bin/myapp-handler` but did not create it. Added a minimal executable handler so the example can run.
- The idle timeout section used `TimeoutStopSec=60` as if it stopped the service after inactivity. `TimeoutStopSec=` controls how long systemd waits during service stop before killing the service. Replaced it with an application-level `MYAPP_IDLE_TIMEOUT=60` environment setting consumed by the Python example.
- The monitoring section described `NAccepted` and `NConnections` as timestamps. Updated the wording to describe them as socket connection counters.

## Review Notes
The post is technically valid after the fixes. For a production service, consider using a systemd-aware library or `sd_listen_fds()` bindings to validate socket type and fd names more thoroughly, and consider SELinux/firewall configuration if exposing the port beyond local testing.
