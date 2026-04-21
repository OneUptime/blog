# Validation Summary: How to Bind SSH Tunnel to a Specific IPv4 Address Instead of localhost

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- OpenSSH local port forwarding
- SSH client configuration
- SSH server forwarding controls
- IPv4 bind addresses
- Linux firewall rules with iptables
- Socket and connectivity testing with ss and nc

## Sources Consulted
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh.1
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config.5
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config.5
- Local OpenSSH client version/help output: OpenSSH_9.6p1
- Local iptables, ss, and OpenBSD netcat help output for command syntax

## Issues Found
- The post stated that local forwards bind to `127.0.0.1` by default. OpenSSH documents this as binding according to the client-side `GatewayPorts` setting, which defaults to loopback. Updated the wording to say loopback addresses, with `127.0.0.1` as the typical IPv4 case.
- The "Enabling Non-Localhost Bind" section incorrectly suggested that `GatewayPorts` or server-side `sshd_config` changes are required for `-L` non-loopback binds. Updated it to clarify that an explicit local bind address is controlled by the SSH client, while the server must still permit TCP forwarding.
- The post mixed up client-side and server-side `GatewayPorts` behavior. Updated the comments to explain that `GatewayPorts` in `sshd_config` controls non-loopback binds for remote forwards (`-R`), not explicit local `-L` bind addresses.
- The post included `AllowStreamLocalForwarding yes` in a TCP/IPv4 forwarding example. That directive is for Unix-domain socket forwarding, not TCP local port forwarding. Replaced the section with the relevant `AllowTcpForwarding` setting and a scoped `GatewayPorts clientspecified` note for `-R`.
- The "Share database tunnel with entire 10.0.0.0/8 subnet" comment overstated what the bind address alone does. Updated it to say the tunnel is shared on the `10.0.0.5` interface and is usable by machines that can reach that address.

## Review Notes
The iptables examples are syntactically valid, but firewall rule order matters on real systems. Existing earlier ACCEPT rules or a distribution firewall manager may require equivalent rules in that system's native firewall configuration.
