# How to Use SSH Multiplexing for Faster Connections on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, SSH, Performance, Productivity

Description: Learn how to configure SSH multiplexing on Ubuntu to reuse existing SSH connections, dramatically reducing the time to open subsequent connections to the same server.

---

Every new SSH connection involves a full handshake: TCP connection, key exchange, authentication, and session setup. On a fast network this takes a fraction of a second, but over a slow link or when connecting repeatedly in scripts, the overhead adds up quickly. SSH multiplexing reuses an existing SSH connection as a transport for new sessions, making subsequent connections to the same host nearly instant.

## How SSH Multiplexing Works

SSH multiplexing uses a control socket (a Unix domain socket file) to coordinate multiple sessions over a single TCP connection. When you open the first connection to a host, SSH creates a control master. Every subsequent connection to the same host connects to the control socket instead of creating a new TCP connection, bypassing the entire handshake.

Benefits:
- Subsequent connections open in milliseconds
- Reduces load on the SSH server (fewer connections)
- Useful in scripts that open many SSH connections
- Port forwarding can be reused across sessions

## Enabling Multiplexing for Specific Hosts

The cleanest way is to configure multiplexing in `~/.ssh/config`:

```text
# ~/.ssh/config

Host frequent-server
    HostName server.example.com
    User ubuntu
    IdentityFile ~/.ssh/id_ed25519
    # Enable multiplexing
    ControlMaster auto
    # Path to the control socket file
    # %h = hostname, %p = port, %r = username (prevents conflicts)
    ControlPath ~/.ssh/control/%h_%p_%r
    # Keep the control master alive for 10 minutes after last session closes
    ControlPersist 10m
```

Create the control socket directory:

```bash
mkdir -p ~/.ssh/control
chmod 700 ~/.ssh/control
```

Now the first connection to `frequent-server` becomes the control master. All subsequent connections reuse it:

```bash
# First connection - establishes the control master
ssh frequent-server

# In a new terminal - reuses the existing connection (no authentication needed)
ssh frequent-server   # Opens instantly

# Check the control socket exists
ls -la ~/.ssh/control/
```

## Enabling Multiplexing for All Hosts

If you want multiplexing everywhere by default:

```text
# ~/.ssh/config

Host *
    ControlMaster auto
    ControlPath ~/.ssh/control/%h_%p_%r
    ControlPersist 1h
```

`ControlMaster auto` means:
- If a control socket exists for this host, use it as a slave connection
- If no control socket exists, create one (become the master)

## Understanding ControlPersist

`ControlPersist` controls how long the control master process keeps running after the last session closes:

```text
# Keep master alive for 10 minutes
ControlPersist 10m

# Keep master alive for 1 hour
ControlPersist 1h

# Keep master alive indefinitely (until explicitly stopped)
ControlPersist yes

# Stop control master immediately when last session closes
ControlPersist no
```

With `ControlPersist 10m`, after you close your SSH session the control master stays running in the background for 10 minutes. If you reconnect within that window, the connection is instant.

## Using Multiplexing on the Command Line

Without modifying `~/.ssh/config`, enable multiplexing inline:

```bash
# Create a control master connection (stays in background)
ssh -fN -M -S /tmp/ssh-mux-server1 user@server.example.com
# -f: go to background
# -N: don't execute a command
# -M: become master
# -S: path to the control socket

# Connect using the existing master
ssh -S /tmp/ssh-mux-server1 user@server.example.com

# Run a command through the mux (without opening a shell)
ssh -S /tmp/ssh-mux-server1 user@server.example.com "uptime"

# Close the master when done
ssh -S /tmp/ssh-mux-server1 -O exit user@server.example.com
```

## Controlling the Multiplexer

SSH provides a control interface for managing multiplexed connections:

```bash
# Check if a control master is running for a host
ssh -O check -S ~/.ssh/control/server.example.com_22_ubuntu server.example.com

# Or use the config-defined socket (matches ControlPath pattern)
ssh -O check frequent-server

# Stop (close) the control master
ssh -O stop frequent-server

# Exit immediately (closes all slaves too)
ssh -O exit frequent-server
```

## Using Multiplexing in Scripts

For scripts that make many connections, multiplexing provides major speedups:

```bash
#!/bin/bash
# deploy.sh - Example using multiplexing for faster multi-step deployment

SERVER="deploy-user@server.example.com"
SOCKET="/tmp/ssh-deploy-$$"

# Establish the control master connection
ssh -fN -M -S "$SOCKET" $SERVER

# All subsequent operations reuse the same connection
ssh -S "$SOCKET" $SERVER "sudo systemctl stop myapp"
ssh -S "$SOCKET" $SERVER "cd /opt/myapp && git pull"
ssh -S "$SOCKET" $SERVER "pip install -r requirements.txt"
ssh -S "$SOCKET" $SERVER "sudo systemctl start myapp"
ssh -S "$SOCKET" $SERVER "systemctl status myapp"

# Close the control master when done
ssh -S "$SOCKET" -O exit $SERVER
echo "Deployment complete"
```

Without multiplexing, each of those `ssh` calls would take 1-3 seconds for the handshake. With multiplexing, they run nearly instantly.

## Port Forwarding Through the Multiplexer

You can add port forwarding to an existing multiplexed connection without opening a new connection:

```bash
# Add a port forward to an existing mux connection
ssh -O forward -L 8080:localhost:80 frequent-server

# Add a remote port forward
ssh -O forward -R 2222:localhost:22 frequent-server

# Cancel a port forward
ssh -O cancel -L 8080:localhost:80 frequent-server
```

## Rsync and scp with Multiplexing

File transfer tools benefit significantly from multiplexing:

```bash
# rsync using the control socket
rsync -avz -e "ssh -o ControlPath=~/.ssh/control/%h_%p_%r" \
    /local/dir/ user@server.example.com:/remote/dir/

# If you have the host configured in ~/.ssh/config with multiplexing,
# rsync picks it up automatically
rsync -avz /local/dir/ frequent-server:/remote/dir/
```

## Security Considerations

The control socket file itself needs to be protected:

```bash
# The control directory should be owner-accessible only
chmod 700 ~/.ssh/control

# Control socket files are created with restricted permissions automatically
ls -la ~/.ssh/control/
# srwx------ 1 user user ... server.example.com_22_ubuntu
```

The socket is created with permissions that only allow the owning user to connect to it. However, if someone gains access to your user account, they can reuse your control master connections. Keep this in mind on shared systems.

## Disabling Multiplexing for Specific Connections

If you've enabled multiplexing globally but need to bypass it for a specific connection:

```bash
# Force a fresh connection, ignoring any control master
ssh -o ControlMaster=no -o ControlPath=none user@server.example.com

# Or set in ~/.ssh/config for a specific host
Host no-mux-server
    HostName critical-server.example.com
    ControlMaster no
    ControlPath none
```

## Verifying Multiplexing Is Working

```bash
# Time the first connection (establishes the master)
time ssh frequent-server "echo connected"
# Takes 1-3 seconds for handshake

# Time a subsequent connection (reuses the master)
time ssh frequent-server "echo connected"
# Takes milliseconds

# See the control socket in use
ls -la ~/.ssh/control/

# Check connection with verbose output to confirm mux is used
ssh -v frequent-server 2>&1 | grep -i "mux\|control"
# Should show: "ControlSocket ... already exists, disabling multiplexing"
# Wait - confusing wording - this means it FOUND the socket and IS using mux
# The actual mux usage shows: "Entering proxy mux mode"
```

## Troubleshooting

**"ControlSocket ... already exists" but connection is slow**

The socket may be stale from a previous session. Remove it and reconnect:

```bash
rm ~/.ssh/control/server.example.com_22_ubuntu
ssh frequent-server  # Creates new master
```

**Multiplexed connections fail when master drops**

If the master connection drops (network hiccup), all slave connections fail immediately. Configure your application to handle reconnects, and set `ControlPersist` to a reasonable value to minimize the window.

## Summary

SSH multiplexing dramatically reduces connection overhead when connecting to the same server multiple times. Configure it in `~/.ssh/config` with `ControlMaster auto`, a `ControlPath` with unique per-host socket names, and a `ControlPersist` value matching your workflow. The first connection establishes the master; all subsequent ones reuse it and connect in milliseconds. This is particularly valuable in deployment scripts and development workflows where you interact with the same server repeatedly.
