# How to Configure SSH Idle Timeout and Keep-Alive on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Network, Server Administration

Description: Configure SSH idle timeout and keep-alive settings on Ubuntu to disconnect stale sessions automatically and prevent connections from dropping due to network inactivity.

---

SSH sessions can die in two frustrating ways: either they stay open forever after you walk away (a security risk), or they drop prematurely when your network goes quiet for a few minutes (an annoyance). Both issues are controlled by keep-alive and timeout settings, configured on both the server side and the client side.

Understanding which side controls what helps you choose the right fix for your situation.

## How SSH Keep-Alive Works

SSH uses a heartbeat mechanism to detect stale connections. The server can send periodic "alive" messages to the client, and the client can do the same to the server. If one side sends a message and gets no response after a set number of tries, it terminates the connection.

- **ServerAliveInterval / ServerAliveCountMax** - Client-side settings. The client sends keep-alive packets to the server.
- **ClientAliveInterval / ClientAliveCountMax** - Server-side settings. The server sends keep-alive packets to the client.

## Server-Side Configuration

Edit `/etc/ssh/sshd_config` to control how the SSH server handles idle connections:

```bash
sudo nano /etc/ssh/sshd_config
```

### Disconnecting Idle Sessions

These settings cause the server to probe idle clients and disconnect them if they do not respond:

```
# Send a keep-alive message to the client every 300 seconds (5 minutes)
ClientAliveInterval 300

# Disconnect after 3 unanswered messages (15 minutes total of silence)
ClientAliveCountMax 3
```

With these settings, if a client is silent for 15 minutes (300 seconds * 3 attempts), the server closes the connection. This cleans up zombie sessions where someone's terminal was closed without properly exiting.

To disconnect idle sessions more aggressively:

```
# More aggressive: disconnect after 10 minutes of silence
ClientAliveInterval 120
ClientAliveCountMax 3
```

To keep sessions alive indefinitely (useful for automated scripts):

```
# Keep sessions alive regardless of inactivity
ClientAliveInterval 60
ClientAliveCountMax 0
```

Setting `ClientAliveCountMax 0` means the server never disconnects, but still sends keep-alive messages.

### Applying the Changes

```bash
# Validate the configuration before restarting
sudo sshd -t

# Restart the SSH service to apply changes
sudo systemctl restart ssh

# Verify settings took effect (check no errors in service status)
sudo systemctl status ssh
```

## Client-Side Configuration

The client side controls what happens when you're connecting to a remote server that drops idle connections. Configure this in `~/.ssh/config`:

```
# Apply to all hosts
Host *
    # Send keep-alive messages to the server every 60 seconds
    ServerAliveInterval 60
    # Disconnect after 5 unanswered messages (5 minutes)
    ServerAliveCountMax 5
```

For a specific server that is known to drop connections:

```
Host flaky-server
    HostName 10.0.0.50
    User ubuntu
    # Keep connection alive with frequent pings
    ServerAliveInterval 30
    ServerAliveCountMax 10
```

### One-Off Connection Options

You can specify keep-alive settings on the command line without modifying any config files:

```bash
# Keep connection alive with 60-second intervals
ssh -o ServerAliveInterval=60 user@server

# Combine with other options
ssh -o ServerAliveInterval=60 -o ServerAliveCountMax=3 user@server
```

## Setting Idle Timeout via the TMOUT Shell Variable

On the server, you can also enforce idle session timeouts at the shell level using the `TMOUT` variable. This terminates the user's shell session (and thus the SSH connection) after a period of inactivity:

```bash
# Set a 10-minute shell timeout in /etc/profile.d/timeout.sh
sudo tee /etc/profile.d/timeout.sh << 'EOF'
# Terminate idle shell sessions after 600 seconds (10 minutes)
# TMOUT is readonly to prevent users from overriding it
readonly TMOUT=600
export TMOUT
EOF

# Set correct permissions
sudo chmod +x /etc/profile.d/timeout.sh
```

This approach affects all interactive shell sessions, not just SSH. It works independently of SSH's keep-alive settings.

## Understanding the Difference Between Timeouts and Keep-Alives

These are related but distinct concepts:

| Setting | Purpose | Where Configured |
|---|---|---|
| `ClientAliveInterval` | Server sends probes to detect dead clients | sshd_config (server) |
| `ClientAliveCountMax` | Max unanswered probes before disconnect | sshd_config (server) |
| `ServerAliveInterval` | Client sends probes to keep connection alive | ssh_config or ~/.ssh/config (client) |
| `ServerAliveCountMax` | Max unanswered server probes before client exits | ssh_config or ~/.ssh/config (client) |
| `TMOUT` | Shell exits after inactivity | Shell profile |

## Diagnosing Connection Drop Issues

If connections are dropping unexpectedly, gather information before adjusting settings:

```bash
# Check SSH logs on the server for disconnect reasons
sudo journalctl -u ssh --since "1 hour ago" | grep -i "disconnect\|timeout\|closing"

# Look for "Timeout, server X.X.X.X not responding" in client output
ssh -v user@server 2>&1 | grep -i "alive\|timeout"

# Check if a NAT gateway or firewall is the culprit by looking for
# "Connection reset by peer" or "Broken pipe" errors
sudo grep "broken pipe\|reset by peer" /var/log/auth.log
```

## NAT Traversal and Firewall Keepalives

Many firewalls and NAT gateways terminate TCP connections that are idle for more than a few minutes (typically 5-15 minutes, depending on the device). If you are connecting through such a device, even correctly configured SSH keep-alives may not help if the interval is too long.

```bash
# For connections through strict firewalls, use short intervals
# Add to ~/.ssh/config
Host *
    ServerAliveInterval 30
    ServerAliveCountMax 6
    TCPKeepAlive yes
```

`TCPKeepAlive yes` enables TCP-level keepalives, which operate at the network layer. This is separate from SSH-level keep-alives and can help with some firewall configurations. The downside is that TCP keepalives can be lost if routing changes, while SSH-level keep-alives are more reliable.

## System-Wide SSH Client Configuration

If you want keep-alive settings applied to all users on a system (useful for jump servers or bastion hosts), edit `/etc/ssh/ssh_config`:

```bash
sudo nano /etc/ssh/ssh_config
```

Add or modify:

```
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

This applies to all outbound SSH connections made from that system.

## Summary

SSH idle timeouts and keep-alives are a balance between security and usability. Server-side settings (`ClientAliveInterval` and `ClientAliveCountMax` in `sshd_config`) control when the server disconnects idle clients. Client-side settings (`ServerAliveInterval` and `ServerAliveCountMax` in `~/.ssh/config`) keep connections alive through firewalls and NAT. For shell-level enforcement, the `TMOUT` variable terminates inactive sessions at the shell layer. Start with `ClientAliveInterval 300` and `ClientAliveCountMax 3` on the server for reasonable security, and `ServerAliveInterval 60` on the client to maintain connections through typical firewalls.
