# How to Use SSH Escape Sequences to Manage IPv4 Port Forwards at Runtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Escape Sequences, IPv4, Port Forwarding, Runtime, CLI

Description: Learn how to use SSH escape sequences to add, list, and remove IPv4 port forwards in an active SSH session without reconnecting.

---

SSH escape sequences are special key combinations that let you interact with the SSH session itself - not the remote shell. They allow you to add or remove port forwards, check connection status, and even background the session, all from an active interactive session when the relevant escape options are enabled.

## Entering the SSH Escape Prompt

The default escape character is `~`. To activate it, press `Enter` then `~` then a command character.

> **Important:** The `~` must follow a newline. Press Enter first, then `~`.

On current OpenSSH releases, the `~C` command-line prompt is disabled by default. Enable it for sessions where you need to manage port forwards at runtime:

```bash
ssh -o EnableEscapeCommandline=yes user@203.0.113.10
```

## Escape Sequence Reference

| Sequence | Action |
|----------|--------|
| `~C` | Open SSH command-line prompt (to manage port forwards, when enabled) |
| `~#` | List forwarded connections |
| `~?` | Show help for all escape sequences |
| `~.` | Disconnect from the SSH session |
| `~^Z` | Suspend/background the SSH session |
| `~&` | Background SSH at logout while forwarded or X11 connections finish |

## Adding a Local Port Forward at Runtime

```bash
# In an active SSH session, press Enter then ~C to open the command prompt

# You'll see:
ssh>

# Add a local port forward: local 8080 → remote 192.168.10.5:80
ssh> -L 8080:192.168.10.5:80
Forwarding port.

# Test the new forward from your local machine
# (in another terminal)
curl http://127.0.0.1:8080/
```

## Adding a Remote Port Forward at Runtime

```bash
# In the SSH escape prompt:
ssh> -R 9090:127.0.0.1:3000
Forwarding port.
# Now port 9090 on the remote server's loopback interface forwards to 127.0.0.1:3000 on your machine
```

## Canceling a Port Forward

```bash
# Cancel a local forward on port 8080
ssh> -KL8080

# Cancel a remote forward on port 9090
ssh> -KR9090
```

## Listing Forwarded Connections

```bash
# List currently open forwarded connections
# In the active SSH session, press Enter, then type: ~#
The following connections are open:
  #0 client-session (t4 r0 i0/0 o0/0 e[write]/0 fd 4/5/6 sock 4 cc -1)
  #1 direct-tcpip: listening port 8080 for 192.168.10.5 port 80
```

## Practical Workflow: Dynamic Tunnels During a Session

```bash
# 1. SSH into the bastion
ssh -o EnableEscapeCommandline=yes user@203.0.113.10

# 2. Discover an internal service while exploring
#    You find a web app on 10.0.0.30:3000

# 3. Add a local forward without disconnecting
# Press Enter, then type: ~C
ssh> -L 7777:10.0.0.30:3000
Forwarding port.

# 4. From another terminal, access the internal service
curl http://127.0.0.1:7777/

# 5. Remove the forward when done
# Press Enter, then: ~C
ssh> -KL7777
```

## Key Takeaways

- `~C` opens the SSH command prompt for managing port forwards without reconnecting when `EnableEscapeCommandline` is enabled.
- `-L local_port:remote_host:remote_port` adds a local forward; `-KL[bind_address:]local_port` cancels it.
- `-R remote_port:local_host:local_port` adds a remote forward; `-KR[bind_address:]remote_port` cancels it.
- `~#` lists open forwarded connections in the current session.
