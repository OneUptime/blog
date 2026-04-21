# Validation Summary: How to Create a Reverse SSH Tunnel to Access IPv4 Hosts Behind NAT

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenSSH client
- OpenSSH server configuration
- SSH reverse port forwarding
- IPv4 NAT traversal
- autossh
- systemd service units
- Linux firewall and socket inspection commands

## Sources Consulted
- OpenSSH ssh(1) manual: https://man.openbsd.org/ssh.1
- OpenSSH ssh_config(5) manual: https://man.openbsd.org/ssh_config
- OpenSSH sshd_config(5) manual: https://man.openbsd.org/sshd_config
- autossh(1) Debian man page: https://manpages.debian.org/testing/autossh/autossh.1.en.html
- systemd.service(5) manual: https://www.man7.org/linux/man-pages/man5/systemd.service.5.html
- systemd.unit(5) manual: https://man7.org/linux/man-pages/man5/systemd.unit.5.html
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737
- Local command validation with `ssh -G`, `sshd -t`, and `systemd-analyze verify`

## Issues Found

1. **Loopback reverse tunnel described as public access**: The initial `-R 2222:localhost:22` command creates a remote listener bound to loopback by default, not a public listener. Updated the comments and access instructions to clarify that the first tunnel is reached via `127.0.0.1` on the public server.

2. **Public access wording missed the required bind address**: `GatewayPorts clientspecified` allows a client-selected non-loopback bind address, but it does not make `-R 2222:localhost:22` public by itself. Updated the text to state that a non-loopback bind address must be specified in the `-R` option for external access.

3. **Access example could fail from arbitrary machines**: The post previously said `ssh -p 2222 private-user@203.0.113.10` worked from any machine in the basic tunnel section. Moved that example behind wording that ties it to the later public-bind example.

4. **Incorrect forwarding restriction**: The hardening snippet used `PermitOpen localhost:2222`, but remote forward listen ports are restricted with `PermitListen`, not `PermitOpen`. Changed this to `PermitListen 2222`.

5. **Over-broad tunnel user forwarding permission**: The hardening snippet used `AllowTcpForwarding yes`, which permits both local and remote forwarding. Changed it to `AllowTcpForwarding remote` for the reverse-tunnel-only user.

6. **systemd network-online ordering was incomplete**: `Wants=network-online.target` pulls in the target but does not order the service after it. Changed `After=network.target` to `After=network-online.target`.

7. **autossh log location was misleading**: The systemd service runs on the private host, so `journalctl -u reverse-tunnel -f` should be run there. Updated the monitoring comment accordingly.

8. **Conclusion referenced the wrong restriction**: Updated the conclusion from `PermitOpen` restrictions to `PermitListen` restrictions.

## Review Notes
- The SSH `-4`, `-f`, `-N`, `-R`, `-o ServerAliveInterval`, `-o ServerAliveCountMax`, `ExitOnForwardFailure`, `StrictHostKeyChecking`, and `NoHostAuthenticationForLocalhost` options are valid OpenSSH options.
- The autossh `-M 0` usage is valid; its man page documents that monitor port `0` disables autossh's monitor port and relies on SSH exiting, commonly with `ServerAliveInterval` and `ServerAliveCountMax`.
- The example address `203.0.113.10` is in TEST-NET-3, which is reserved for documentation and should be replaced with a real public server address in actual deployments.
- `NoHostAuthenticationForLocalhost yes` is syntactically valid, but it disables host authentication for the loopback connection. A future improvement would be to show a `HostKeyAlias`-based approach for preserving host-key checks through the tunnel.
- The `iptables` rule is technically valid, but it may not persist across reboot and may not match systems using nftables, firewalld, or ufw as the primary firewall frontend.
