# How to Set Up SSH Key-Based Authentication for IPv4 Tunnel Automation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Key Authentication, IPv4, Automation, Tunneling, Security, DevOps

Description: Learn how to configure SSH key-based authentication with restricted authorized_keys entries to automate IPv4 SSH tunnels securely.

---

Automated SSH tunnels (e.g., for persistent VPN-like access or scheduled data transfers) should use key-based authentication with tightly scoped key permissions. This avoids password prompts and limits what the key is allowed to do.

## Generating a Dedicated Tunnel Key

Use a separate key pair for tunnel automation - never reuse interactive session keys.

```bash
# Generate an Ed25519 key pair for tunnel automation (no passphrase for automation)

ssh-keygen -t ed25519 -f ~/.ssh/tunnel_automation_key -N "" \
  -C "tunnel-automation-$(hostname)-$(date +%Y%m%d)"

# Display the public key to copy to the server
cat ~/.ssh/tunnel_automation_key.pub
```

## Restricted authorized_keys Entry

Restrict the key so local forwards can only target the intended service, not interactive shells.

```bash
# /home/tunneluser/.ssh/authorized_keys on the remote server

# Restrict this key:
# - Only allow connections from the automation server's IPv4 address
# - Only allow local forwarding to 10.0.1.20:5432
# - Disable interactive shell, PTY, X11, agent forwarding, and ~/.ssh/rc
from="10.0.0.50",restrict,port-forwarding,permitopen="10.0.1.20:5432",command="/bin/false" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... tunnel-automation-myserver-20260101
```

> The `command="/bin/false"` prevents shell access while still allowing port forwarding.

## SSH Config for the Automation Client

```bash
# ~/.ssh/config (on the automation server 10.0.0.50)

Host tunnel-remote
    HostName 203.0.113.10       # Remote server IPv4
    User tunneluser
    IdentityFile ~/.ssh/tunnel_automation_key
    AddressFamily inet           # Force IPv4
    # Local port forward: 127.0.0.1:5432 → remote 10.0.1.20:5432
    LocalForward 5432 10.0.1.20:5432
    # Prevent remote shell execution
    SessionType none
    # Do not request a TTY
    RequestTTY no
    ServerAliveInterval 30
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
```

## Starting the Automated Tunnel

```bash
# Start tunnel in background, no TTY, no shell
ssh -fN tunnel-remote

# Or use autossh for auto-reconnect
autossh -M 0 -fN \
  -o "ServerAliveInterval=30" \
  -o "ServerAliveCountMax=3" \
  -o "ExitOnForwardFailure=yes" \
  -i ~/.ssh/tunnel_automation_key \
  -L 5432:10.0.1.20:5432 \
  tunneluser@203.0.113.10
```

## Systemd Service for Persistent Tunnel

```ini
# /etc/systemd/system/ssh-tunnel.service
[Unit]
Description=SSH Tunnel to production database
After=network-online.target
Wants=network-online.target

[Service]
User=tunneluser
ExecStart=/usr/bin/autossh -M 0 -N \
  -o "ServerAliveInterval=30" \
  -o "ServerAliveCountMax=3" \
  -o "ExitOnForwardFailure=yes" \
  -i /home/tunneluser/.ssh/tunnel_automation_key \
  -L 5432:10.0.1.20:5432 \
  tunneluser@203.0.113.10
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
systemctl enable --now ssh-tunnel
systemctl status ssh-tunnel
```

## Key Takeaways

- Use a dedicated key pair per automated tunnel; never share keys across systems.
- Restrict the authorized_keys entry with `from=`, `restrict`, `port-forwarding`, `permitopen=`, and `command="/bin/false"`.
- Use `autossh` or a systemd service to ensure the tunnel auto-restarts after disconnections.
- `ExitOnForwardFailure yes` makes SSH exit if the port forward cannot be established, allowing autossh to retry.
