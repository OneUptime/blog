# Validation Summary: How to Set Up Reverse SSH Tunnels on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenSSH (ssh client, sshd_config, authorized_keys options)
- autossh
- systemd unit files
- Ubuntu user management (useradd)
- `ss` and `lsof` for inspecting listening ports

## Sources Consulted
- OpenSSH sshd_config man page — https://man.openbsd.org/sshd_config (GatewayPorts, PermitOpen, PermitListen)
- OpenSSH sshd authorized_keys format — https://man.openbsd.org/sshd.8 (restrict, permitlisten, permitopen, no-pty, no-agent-forwarding, no-X11-forwarding)
- OpenSSH ssh_config / ssh(1) man pages (ServerAliveInterval, ServerAliveCountMax, -R, -N, -J ProxyJump)
- autossh README — https://github.com/Autossh/autossh (`-M 0` semantics)
- useradd(8) man page — https://man7.org/linux/man-pages/man8/useradd.8.html (system user home directory behavior)
- systemd.unit / systemd.service docs (StartLimitIntervalSec placement, Restart=always, Type=simple)

## Issues Found
1. **`useradd -r -s /bin/false tunnel-user` did not create a home directory.** Per the useradd(8) man page, system users (`-r`) do not get a home directory created regardless of `CREATE_HOME` in `/etc/login.defs` — `-m` must be passed explicitly. Without it, the subsequent `ssh-keygen -f /home/tunnel-user/.ssh/id_ed25519` would fail because the path does not exist. Fix: added `-m` and a brief comment explaining why.
2. **`permitopen="localhost:2222"` was the wrong restriction for a reverse tunnel.** `permitopen` restricts destinations for local (`-L`) port forwarding. The correct option for restricting reverse (`-R`) forwarding listen ports is `permitlisten` (added in OpenSSH 7.8). Fix: replaced with `permitlisten="2222"` and added a one-line note clarifying the distinction.
3. **Misleading description of `GatewayPorts clientspecified`.** The post described it as "allow only specific IPs to access the remote-forwarded port", but `clientspecified` actually lets the SSH client choose the bind address via the `-R` flag — it does not act as an IP allow-list. Fix: rewrote the comment to describe the real behavior and gave an example bind address.

## Review Notes
- The `Restart=always` in the systemd unit is technically redundant with autossh's own reconnect logic, but it serves as a useful belt-and-braces safeguard if autossh itself exits, so it was left as-is.
- Adding `Environment="AUTOSSH_GATETIME=0"` to the systemd unit would make autossh keep retrying even if the first connection fails (useful on boot before networking is fully ready). Not strictly required, so left untouched to avoid scope creep.
- Line continuations (`\`) inside `ExecStart=` are supported by modern systemd, so the multi-line `ExecStart` is fine on current Ubuntu releases.
- `kill $(lsof -ti :2222)` will kill every process with port 2222 open (including forwarded sshd children); acceptable for a quick cleanup but worth being aware of in production.
- `GatewayPorts yes` exposes the forwarded port on all interfaces; consider firewall rules in addition for production relay servers.
