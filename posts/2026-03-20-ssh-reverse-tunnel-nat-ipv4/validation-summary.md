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

## Re-review 2026-06-25 (issue #139)

Issue #139 reported that the autossh systemd unit references `/home/tunnel-user/.ssh/reverse_tunnel_key` without explaining how to create it, leaving less-experienced readers stuck.

### Added
- New `## Creating the Tunnel Key` section placed immediately before `## Persistent Reverse Tunnel with autossh` (where the key is first used), with four sub-steps:
  1. Generate a dedicated keypair matching the post's path/user: `ssh-keygen -t ed25519 -f /home/tunnel-user/.ssh/reverse_tunnel_key -N ""`.
  2. Set ownership (`tunnel-user:tunnel-user`) and permissions (`.ssh` 700, private key 600, public key 644).
  3. Install the public key into the remote `tunnel@203.0.113.10` account's `authorized_keys` via `ssh-copy-id` or manual append, with restrictive options `restrict,port-forwarding,permitlisten="127.0.0.1:2222",command="/usr/sbin/nologin"` (matching the post's reverse port 2222 and existing `nologin` hardening).
  4. Pre-seed the public server's host key into `tunnel-user`'s `known_hosts` (one interactive `ssh` connection, or `ssh-keyscan -H` after out-of-band fingerprint verification) so `StrictHostKeyChecking=yes` succeeds when the unattended service starts.

### Facts verified
- `ssh-keygen -t ed25519 -f <file> -N ""` generates an ed25519 key with no passphrase; private key is created mode 600 by default. Source: https://man.openbsd.org/ssh-keygen.1
- OpenSSH requires `~/.ssh` not writable by others (700 recommended) and `authorized_keys` not accessible by others (600 recommended), or sshd refuses the key under StrictModes. Source: https://man.openbsd.org/sshd.8
- `restrict` disables PTY/agent/X11/port-forwarding; adding `port-forwarding` re-enables forwarding and `permitlisten` limits the reverse listener. Source: https://man.openbsd.org/sshd.8
- `ssh-keyscan -H host >> known_hosts` records a host key but must be verified out of band to avoid MITM. Source: https://man.openbsd.org/ssh-keyscan.1

### Format
- Body-only edit; title, Tags, and Description lines untouched. All new fenced blocks declare a language (`bash` for shell, `text` for the authorized_keys snippet). No em dashes, no smart quotes, single H1.
