# How to Configure SSH ProxyCommand for IPv4 Multi-Hop Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, ProxyCommand, IPv4, Multi-Hop, Bastion Host, Tunneling, Configuration

Description: Learn how to configure SSH ProxyCommand and ProxyJump directives to connect to IPv4 hosts through bastion servers without manual intermediate sessions.

---

In many networks, internal servers are only reachable through a bastion (jump) host. SSH's `ProxyCommand` and `ProxyJump` directives automate multi-hop connections, routing through intermediate IPv4 hosts transparently.

## Single Hop with ProxyJump (Modern Approach)

`ProxyJump` is the simplest method for single-hop connections, available in OpenSSH 7.3+.

```bash
# ~/.ssh/config

Host bastion
    HostName 203.0.113.10    # Public IPv4 of the bastion
    User jumpuser
    IdentityFile ~/.ssh/bastion_key
    AddressFamily inet        # Force IPv4

Host internal-server
    HostName 10.0.0.50       # Internal IPv4, only reachable via bastion
    User admin
    IdentityFile ~/.ssh/internal_key
    # Jump through the bastion to reach the internal server
    ProxyJump bastion
```

```bash
# Connect directly using the config

ssh internal-server
```

## Multi-Hop with ProxyJump (Two Hops)

```bash
# ~/.ssh/config

Host tier1-jump
    HostName 203.0.113.10
    User jumpuser
    AddressFamily inet

Host tier2-jump
    HostName 10.100.0.5      # Reachable only via tier1-jump
    User jumpuser
    ProxyJump tier1-jump

Host deep-server
    HostName 192.168.50.20   # Reachable only via tier2-jump
    User admin
    ProxyJump tier2-jump
```

## ProxyCommand (Classic Approach)

`ProxyCommand` gives more control by specifying the exact command used to create the tunnel.

```bash
# ~/.ssh/config

Host internal-server
    HostName 10.0.0.50
    User admin
    # ssh through bastion, opening a pipe to the target host's SSH port
    ProxyCommand ssh -W %h:%p -q jumpuser@203.0.113.10
    #             -W %h:%p - forward stdin/stdout to host:port (%h=%hostname, %p=%port)
    #             -q       - quiet mode
```

## Using netcat as ProxyCommand

On older systems without `-W` support:

```bash
Host internal-server
    HostName 10.0.0.50
    User admin
    ProxyCommand ssh jumpuser@203.0.113.10 nc %h %p
```

## One-Liner Without Config File

```bash
# Ad-hoc multi-hop connection (no config file needed)
ssh -J jumpuser@203.0.113.10 admin@10.0.0.50

# Two-hop: jump through two bastion hosts
ssh -J user@203.0.113.10,user@10.100.0.5 admin@192.168.50.20

# SCP through a jump host
scp -J jumpuser@203.0.113.10 file.txt admin@10.0.0.50:/tmp/
```

## Agent Forwarding for Key Authentication

With `ProxyJump`, your local SSH client authenticates to each host through the forwarded TCP connection, so you do not need to store private keys on bastion hosts. Enable agent forwarding only if you need to start new SSH connections from the remote host.

```bash
# ~/.ssh/config
Host bastion
    HostName 203.0.113.10
    ForwardAgent no     # Default; avoid forwarding unless required

Host internal-server
    HostName 10.0.0.50
    ProxyJump bastion
    # Your local keys or local ssh-agent authenticate this connection
```

## Key Takeaways

- `ProxyJump` is the cleanest multi-hop SSH method for OpenSSH 7.3+.
- `ProxyCommand ssh -W %h:%p bastion` provides equivalent functionality on clients that support `-W` but not `ProxyJump`.
- Use `-J` on the command line for ad-hoc multi-hop without a config file.
- Keep private keys local; only enable `ForwardAgent yes` when a remote host must initiate further SSH connections.
