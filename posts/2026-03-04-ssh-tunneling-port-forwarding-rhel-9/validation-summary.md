# Validation Summary: How to Configure SSH Tunneling and Port Forwarding on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenSSH client and server
- SSH local port forwarding (`-L`)
- SSH remote port forwarding (`-R`)
- SSH dynamic port forwarding (`-D`)
- OpenSSH server configuration (`sshd_config`)
- Cockpit / RHEL web console
- Linux process and socket inspection commands (`ps`, `ss`)

## Sources Consulted
- OpenSSH `ssh(1)` manual page: https://man.openbsd.org/ssh
- OpenSSH `sshd_config(5)` manual page: https://man.openbsd.org/sshd_config
- Local OpenSSH client help and installed manual pages (`ssh -V`, `ssh` usage, `man ssh`, `man sshd_config`)
- Red Hat Enterprise Linux 9 documentation, "Using secure communications between two systems with OpenSSH": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/securing_networks/
- Red Hat Enterprise Linux 9 documentation, "Getting started using the RHEL web console": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_systems_using_the_rhel_9_web_console/getting-started-with-the-rhel-9-web-console_system-management-using-the-rhel-9-web-console
- Cockpit Project documentation, "TCP Port and Address": https://cockpit-project.org/guide/latest/listen
- Cockpit Project documentation, "SSL/TLS Usage": https://cockpit-project.org/guide/latest/https

## Issues Found
- The Cockpit local-forwarding example told readers to open `http://localhost:8080`. RHEL web console / Cockpit is documented on port 9090 using HTTPS, and Cockpit supports HTTPS on that port by default. Changed the forwarded URL to `https://localhost:8080`.

## Review Notes
- The OpenSSH forwarding flags and syntaxes shown (`-L`, `-R`, `-D`, `-f`, `-N`, and `-J`) match current OpenSSH usage.
- The server-side directives shown (`AllowTcpForwarding`, `GatewayPorts`, `AllowStreamLocalForwarding`, and `Match Group`) are valid `sshd_config` directives. `GatewayPorts yes` is correctly described as allowing remote forwarded ports to bind beyond loopback.
- RHEL 9 supports OpenSSH server configuration drop-ins under `/etc/ssh/sshd_config.d/`, and restarting `sshd` after validating with `sshd -t` is appropriate.
