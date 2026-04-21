# How to Set AddressFamily inet in SSH Config to Force IPv4 Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, IPv4, AddressFamily, Configuration, Networking, Security, Linux

Description: Learn how to configure the SSH AddressFamily directive to force SSH clients and the SSHD server to use IPv4-only connections.

---

By default, SSH uses `AddressFamily any`, which means it may connect over IPv4 or IPv6 depending on the system's preference. Setting `AddressFamily inet` forces SSH to use IPv4 only, which is useful when IPv6 is unreliable or explicitly unsupported.

## Client-Side: Force IPv4 for SSH Connections

Edit the user's SSH config to always connect over IPv4.

```bash
# ~/.ssh/config (per-user)

# Force all SSH connections to use IPv4

Host *
    AddressFamily inet

# Or apply to specific hosts only
Host bastion.example.com
    AddressFamily inet
    User admin
    IdentityFile ~/.ssh/id_ed25519
```

Alternatively, use the `-4` flag on the command line for a one-off connection:

```bash
# Force IPv4 for a single SSH session
ssh -4 user@bastion.example.com

# Force IPv4 for SCP
scp -4 file.txt user@10.0.0.5:/tmp/
```

## Server-Side: Force IPv4 in sshd_config

Restrict SSHD to listen only on IPv4 addresses.

```bash
# /etc/ssh/sshd_config

# Listen on all IPv4 interfaces only (not IPv6)
AddressFamily inet

# Optionally specify exact IPv4 addresses to listen on
# ListenAddress 0.0.0.0
# ListenAddress 192.168.1.10
```

```bash
# Test the new sshd configuration
sshd -t

# Reload SSHD to apply changes
systemctl reload sshd
```

## Verifying SSHD Listens on IPv4 Only

```bash
# Before change (dual-stack):
ss -tlnp | grep sshd
# tcp  0.0.0.0:22   (IPv4)
# tcp6 :::22        (IPv6)

# After setting AddressFamily inet:
ss -tlnp | grep sshd
# tcp  0.0.0.0:22   (IPv4 only)
```

## System-Wide SSH Client Setting

To apply to all users on the system, edit the global client config:

```bash
# /etc/ssh/ssh_config

Host *
    AddressFamily inet
```

## Troubleshooting

```bash
# If SSH still seems to use IPv6, confirm the effective client setting
ssh -G hostname | grep -i "^addressfamily"

# Confirm connection is IPv4 in verbose mode
ssh -v -4 user@host 2>&1 | grep "Connecting to"
```

## Key Takeaways

- `AddressFamily inet` in `~/.ssh/config` forces the SSH client to IPv4 for all connections.
- `AddressFamily inet` in `/etc/ssh/sshd_config` makes SSHD bind to IPv4 only.
- Use `ssh -4` or `scp -4` for one-off IPv4-only connections without editing config files.
- Always run `sshd -t` to validate `sshd_config` before reloading to prevent lockouts.
