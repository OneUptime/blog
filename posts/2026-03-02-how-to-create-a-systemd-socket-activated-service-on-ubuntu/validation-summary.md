# Validation Summary: How to Create a systemd Socket-Activated Service on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- systemd socket units
- systemd service units
- systemctl and journalctl
- TCP sockets and Unix domain sockets
- Python http.server

## Sources Consulted
- systemd.socket official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.socket.html
- systemd.service official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.exec official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- sd_listen_fds official documentation: https://www.freedesktop.org/software/systemd/man/latest/sd_listen_fds.html
- systemctl official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- Python http.server documentation: https://docs.python.org/3/library/http.server.html
- Python socketserver documentation: https://docs.python.org/3/library/socketserver.html

## Issues Found
- The socket unit example described `MaxConnections=` as a general simultaneous connection limit while using `Accept=false`. Per systemd.socket, `MaxConnections=` only affects per-connection service instances with `Accept=true`, so the example was changed to show it as a commented `Accept=true`-only option.
- The socket unit example described `KeepAlive=yes` as keeping the socket open when the service fails. Per systemd.socket, `KeepAlive=` enables TCP keepalive probes for accepted TCP connections, so the comment was corrected.
- The `myapp.service` comment implied `Requires=myapp.socket` orders the socket first. `Requires=` pulls the socket into the transaction but ordering is handled separately by systemd's socket activation dependencies, so the comment was corrected.
- The Python example read only `LISTEN_FDS` and did not check `LISTEN_PID`, which is part of the systemd socket activation contract. The code now validates `LISTEN_PID`, reads the passed socket from fd 3, and clears the activation environment variables.
- The Python example initialized an `HTTPServer` on an ephemeral port, replaced its socket, but left `server_address`, `server_name`, and `server_port` from the temporary socket. The code now creates the server with `bind_and_activate=False`, replaces the socket, and updates those fields from the activated socket.

## Review Notes
The tutorial is technically relevant and accurate after the corrections. The zero-downtime restart discussion is valid for the shown model where the `.socket` unit remains active while the `.service` unit restarts; real-world behavior still depends on the daemon correctly handling inherited sockets and request retry/timeout behavior.
