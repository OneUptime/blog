# How to Use SSH Config Files to Manage Multiple Connections on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SSH, Config, Multiple Hosts, Linux

Description: Simplify SSH connection management on RHEL by configuring the SSH client config file with host aliases, jump hosts, and per-host settings.

---

If you manage more than a handful of servers, typing out full SSH commands gets old fast. The SSH client config file (`~/.ssh/config`) lets you define aliases, default options, and per-host settings so you can connect with a simple `ssh webserver` instead of `ssh -i ~/.ssh/id_ed25519 -p 2222 admin@web01.prod.example.com`.

## The SSH Config File

The client config file lives at `~/.ssh/config`. Create it if it does not exist:

```bash
touch ~/.ssh/config
chmod 600 ~/.ssh/config
```

## Basic Host Configuration

```bash
vi ~/.ssh/config
```

```
# Web server
Host web01
    HostName web01.prod.example.com
    User admin
    Port 22
    IdentityFile ~/.ssh/id_ed25519

# Database server
Host db01
    HostName db01.prod.example.com
    User dbadmin
    Port 2222
    IdentityFile ~/.ssh/id_ed25519_db
```

Now you can simply type:

```bash
ssh web01
ssh db01
```

## Wildcards and Pattern Matching

### Apply settings to all hosts in a domain

```
Host *.prod.example.com
    User admin
    IdentityFile ~/.ssh/id_ed25519
    ForwardAgent no
    ServerAliveInterval 60

Host *.dev.example.com
    User developer
    IdentityFile ~/.ssh/id_ed25519_dev
    ForwardAgent yes
```

### Default settings for all hosts

Put this at the bottom of the file (SSH uses the first matching value):

```
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    AddKeysToAgent yes
    IdentitiesOnly yes
    Compression yes
```

## Jump Hosts (Bastion Configuration)

### Using ProxyJump

```
# Bastion host
Host bastion
    HostName bastion.example.com
    User admin
    IdentityFile ~/.ssh/id_ed25519

# Internal servers accessed through the bastion
Host internal-*
    ProxyJump bastion
    User admin
    IdentityFile ~/.ssh/id_ed25519

Host internal-web01
    HostName 10.0.1.10

Host internal-db01
    HostName 10.0.1.20
```

Now `ssh internal-web01` automatically jumps through the bastion.

### Multi-hop jumps

```
Host deep-internal
    HostName 172.16.0.10
    ProxyJump bastion,midtier
    User admin
```

This connects through bastion, then midtier, then to the final destination.

## Practical Configuration Examples

### Full production environment config

```
# Global defaults
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3
    AddKeysToAgent yes
    IdentitiesOnly yes
    HashKnownHosts yes
    StrictHostKeyChecking ask

# Bastion hosts
Host bastion-prod
    HostName bastion.prod.example.com
    User admin
    IdentityFile ~/.ssh/id_ed25519
    ForwardAgent no

Host bastion-staging
    HostName bastion.staging.example.com
    User admin
    IdentityFile ~/.ssh/id_ed25519

# Production servers (through bastion)
Host prod-web-*
    ProxyJump bastion-prod
    User admin
    IdentityFile ~/.ssh/id_ed25519

Host prod-web-01
    HostName 10.0.1.10
Host prod-web-02
    HostName 10.0.1.11
Host prod-web-03
    HostName 10.0.1.12

Host prod-db-*
    ProxyJump bastion-prod
    User dbadmin
    IdentityFile ~/.ssh/id_ed25519_db

Host prod-db-01
    HostName 10.0.2.10
Host prod-db-02
    HostName 10.0.2.11

# Staging servers (through staging bastion)
Host staging-*
    ProxyJump bastion-staging
    User admin
    IdentityFile ~/.ssh/id_ed25519

Host staging-web-01
    HostName 10.1.1.10
Host staging-db-01
    HostName 10.1.2.10
```

### Connection multiplexing for faster connections

```
Host *
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 600
```

Create the sockets directory:

```bash
mkdir -p ~/.ssh/sockets
```

With multiplexing, the first SSH connection to a host creates a socket. Subsequent connections reuse it, making them nearly instant.

## Useful Options Reference

| Option | Description |
|---|---|
| HostName | Actual hostname or IP |
| User | Default username |
| Port | SSH port |
| IdentityFile | Path to private key |
| IdentitiesOnly | Only use specified keys |
| ProxyJump | Jump through this host |
| ForwardAgent | Forward SSH agent (use cautiously) |
| LocalForward | Set up a local port forward |
| ServerAliveInterval | Keep-alive interval in seconds |
| ControlMaster | Enable connection multiplexing |
| Compression | Enable compression |
| LogLevel | Debug verbosity |

## Setting Up Port Forwarding in Config

```
Host db-tunnel
    HostName bastion.example.com
    User admin
    LocalForward 5432 db.internal:5432
    LocalForward 6379 redis.internal:6379
```

Now `ssh db-tunnel` automatically sets up both port forwards.

## Troubleshooting

### Config file not being read

```bash
# Check permissions
ls -la ~/.ssh/config
# Must be 600 or 644
```

### See which config values apply to a host

```bash
ssh -G web01
```

This outputs all effective configuration values for that host without connecting.

### Debug connection issues

```bash
ssh -vvv web01
```

## Wrapping Up

A well-organized SSH config file is one of the best productivity tools for any sysadmin. Define your hosts once, set up bastion jumps, enable connection multiplexing, and you can navigate your entire infrastructure with short, memorable aliases. Keep the file in version control (minus any sensitive paths), and use `ssh -G hostname` to verify settings before connecting.
