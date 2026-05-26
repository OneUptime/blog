# Validation Summary: How to Use Ansible to Manage Socket Units in systemd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- systemd socket units
- systemd service units
- Socket activation
- Python `http.server`
- Nginx Unix socket proxying
- Linux Unix domain sockets

## Sources Consulted
- systemd.socket official manual: https://www.freedesktop.org/software/systemd/man/254/systemd.socket.html
- systemd.service official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.unit official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.exec official manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- sd_listen_fds official manual: https://www.freedesktop.org/software/systemd/man/latest/sd_listen_fds.html
- Ansible `ansible.builtin.systemd_service` official documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `ansible.builtin.copy` official documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Python `http.server` official documentation: https://docs.python.org/3/library/http.server.html
- Local systemd 255 manual pages and `systemctl --help` output

## Issues Found
- The service template said manual starts were refused, but only emitted comments. Added `RefuseManualStart=yes` in the `[Unit]` section when `socket_also_standalone` is false.
- The `Accept=yes` path was described as inetd-style per-connection handling, but the service template did not connect the accepted socket to standard input/output. Added `StandardInput=socket` for `Accept=yes`.
- The role always deployed `{{ socket_name }}.service`, even though `Accept=yes` requires a template service named `{{ socket_name }}@.service`. Updated the role task destination to select the correct filename.
- Unit changes only notified a daemon reload. A changed socket unit, such as a changed `ListenStream`, needs the socket restarted for the active listener to change. Updated template notifications to restart the socket and made the restart handler run `daemon_reload`.
- The Python HTTP example copied `/opt/mywebapp/server.py` without first creating `/opt/mywebapp`; Ansible `copy` does not create the parent directory for a file destination. Added a directory creation task.
- The Python socket activation check only looked at `LISTEN_FDS`. Updated it to also verify `LISTEN_PID` and expect exactly one file descriptor, matching the systemd socket activation protocol.
- The example used `ListenStream=8080`, which systemd treats as an IPv6 listener. The Python example wraps the passed descriptor as an IPv4 socket, so the example now uses `0.0.0.0:8080`.
- The Accept-mode section still implied a separate task adjustment was required after the role task was fixed. Updated the wording to say the role task handles it, while preserving the optional separate-task example.

## Review Notes
The post is now technically consistent for the demonstrated role patterns. A future improvement would be to mention that applications must explicitly support systemd socket activation, either through the native file descriptor protocol or inetd-style standard input/output handling.
