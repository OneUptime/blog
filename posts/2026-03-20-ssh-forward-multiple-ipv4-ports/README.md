# How to Forward Multiple IPv4 Ports Through a Single SSH Connection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSH, Port Forwarding, IPv4, Multiple Ports, Tunneling, Networking

Description: Forward multiple IPv4 ports through a single SSH connection using multiple -L flags, SSH config LocalForward directives, or the ControlMaster multiplexing feature.

## Introduction

Rather than opening a separate SSH connection for each port tunnel, you can forward multiple ports through a single SSH session. This saves authentication overhead and reduces the number of connections to manage.

## Multiple -L Flags in One Command

```bash
# Forward 4 ports in one SSH session

ssh -4 -fN \
  -L 5432:db.internal:5432 \
  -L 6379:redis.internal:6379 \
  -L 9200:es.internal:9200 \
  -L 8080:web.internal:80 \
  user@203.0.113.10
```

## Multiple Ports in ~/.ssh/config

```bash
# ~/.ssh/config

Host services-tunnel
    HostName 203.0.113.10
    User admin
    AddressFamily inet
    IdentityFile ~/.ssh/id_rsa

    # Multiple LocalForward directives
    LocalForward 127.0.0.1:5432 db-primary.internal:5432
    LocalForward 127.0.0.1:5433 db-replica.internal:5432
    LocalForward 127.0.0.1:6379 redis.internal:6379
    LocalForward 127.0.0.1:9200 elasticsearch.internal:9200
    LocalForward 127.0.0.1:8080 grafana.internal:3000

    ServerAliveInterval 30
    ServerAliveCountMax 3
    ExitOnForwardFailure yes
```

```bash
# Start all tunnels with one command
ssh -fN services-tunnel

# All services now available locally:
psql -h 127.0.0.1 -p 5432 -U dbuser mydb
redis-cli -h 127.0.0.1 -p 6379
curl http://127.0.0.1:8080/  # Grafana UI
```

## Combining Local and Remote Forwards

```bash
ssh -4 -fN \
  -L 5432:db.internal:5432 \
  -R 8080:localhost:3000 \
  -L 9090:prometheus.internal:9090 \
  user@203.0.113.10
```

## SSH ControlMaster for Connection Sharing

Add tunnels to an existing shared connection:

```bash
# ~/.ssh/config

Host 203.0.113.10
    ControlMaster auto
    ControlPath ~/.ssh/cm-%r@%h:%p
    ControlPersist 10m

Host *-via-bastion
    ProxyJump 203.0.113.10
```

```bash
# First connection establishes the master
ssh user@203.0.113.10

# Add more port forwards through the existing connection
ssh -O forward -L 5432:db.internal:5432 -S ~/.ssh/cm-user@203.0.113.10:22 user@203.0.113.10
ssh -O forward -L 6379:redis.internal:6379 -S ~/.ssh/cm-user@203.0.113.10:22 user@203.0.113.10
```

## Script to Start All Tunnels

```bash
#!/bin/bash
# /usr/local/bin/start-tunnels.sh

JUMP_HOST="user@203.0.113.10"

TUNNELS=(
    "5432:db-primary.internal:5432"
    "5433:db-replica.internal:5432"
    "6379:redis.internal:6379"
    "9200:elasticsearch.internal:9200"
    "8080:grafana.internal:3000"
)

# Build the ssh command
SSH_CMD="autossh -M 0 -4 -fN"
for tunnel in "${TUNNELS[@]}"; do
    SSH_CMD+=" -L ${tunnel}"
done
SSH_CMD+=" -o 'ServerAliveInterval 30'"
SSH_CMD+=" -o 'ServerAliveCountMax 3'"
SSH_CMD+=" -o 'ExitOnForwardFailure yes'"
SSH_CMD+=" ${JUMP_HOST}"

eval "${SSH_CMD}"

echo "Started ${#TUNNELS[@]} tunnels through ${JUMP_HOST}"
ss -tlnp | grep ssh
```

## Conclusion

Multiple SSH port forwards through a single connection use one set of credentials and one connection slot on the jump host. Configure them via multiple `-L` flags on the command line or `LocalForward` directives in `~/.ssh/config`. Use `autossh` for persistence and a startup script to manage all tunnels as a group. ControlMaster enables adding tunnels to existing connections without reauthentication.
