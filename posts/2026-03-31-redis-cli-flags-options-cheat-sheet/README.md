# Redis CLI Flags and Options Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLI, Command, Cheat Sheet, Administration

Description: Complete redis-cli flags and options reference covering connection, authentication, output formatting, pipe mode, and cluster management flags.

---

`redis-cli` is the official command-line client for Redis. It supports a rich set of flags for connecting, scripting, debugging, and managing clusters. Here is the complete reference.

## Connection Flags

```bash
redis-cli -h 127.0.0.1       # host (default: 127.0.0.1)
redis-cli -p 6379             # port (default: 6379)
redis-cli -n 0                # database number (default: 0)
redis-cli -s /tmp/redis.sock  # Unix socket path
redis-cli -u redis://user:pass@host:6379/0  # connection URL
```

## Authentication

```bash
redis-cli -a password                 # password
redis-cli --pass password             # same as -a
redis-cli --user alice -a password    # username + password (ACL)
redis-cli --askpass                   # prompt for password
```

## TLS / SSL

```bash
redis-cli --tls \
  --cert /path/to/client.crt \
  --key /path/to/client.key \
  --cacert /path/to/ca.crt
```

## Output and Formatting

```bash
redis-cli --no-auth-warning    # suppress auth warning in scripts
redis-cli --raw                # raw output (no formatting)
redis-cli --no-raw             # formatted output with type info
redis-cli -3                   # use RESP3 protocol
redis-cli --csv                # CSV output for multi-bulk replies
redis-cli --quoted-input       # parse quoted strings in input
redis-cli --show-pushes <yn>   # show RESP3 PUSH messages
redis-cli -v                   # print version
```

## Running Commands Non-Interactively

```bash
# Run a single command
redis-cli GET key1

# Run multiple commands from a file
redis-cli < commands.txt

# Pipe commands from stdin
echo "SET foo bar" | redis-cli

# Pipe mode (bulk import, bypasses protocol overhead)
redis-cli --pipe < bulk_commands.txt

# Pipe mode with custom timeout (seconds)
redis-cli --pipe --pipe-timeout 30 < bulk_commands.txt
```

## Repeated Execution

```bash
# Run a command N times
redis-cli -r 10 INCR counter

# Run indefinitely with interval (seconds)
redis-cli -r -1 -i 1 INFO clients

# Run every 0.5 seconds
redis-cli -r -1 -i 0.5 DBSIZE
```

## Monitoring and Diagnostics

```bash
# Real-time command monitor
redis-cli MONITOR

# Latency monitor (ms)
redis-cli --latency
redis-cli --latency-history      # rolling history
redis-cli --latency-dist         # latency distribution graph

# Intrinsic system latency
redis-cli --intrinsic-latency 5  # test for 5 seconds

# Find large keys
redis-cli --bigkeys

# Find hot keys (LFU required)
redis-cli --hotkeys

# Real-time statistics dashboard
redis-cli --stat
redis-cli --stat -i 0.5          # refresh every 0.5s
```

## RDB Backup and Restore

```bash
# Download RDB snapshot from remote server
redis-cli --rdb /tmp/backup.rdb

# Save to file using SAVE + copy
redis-cli SAVE && scp /var/lib/redis/dump.rdb backup-server:/backups/
```

## Cluster Management

```bash
# Create cluster
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  --cluster-replicas 1

# Check cluster health
redis-cli --cluster check 127.0.0.1:7000

# Fix cluster issues
redis-cli --cluster fix 127.0.0.1:7000

# Reshard slots
redis-cli --cluster reshard 127.0.0.1:7000

# Add node
redis-cli --cluster add-node 127.0.0.1:7006 127.0.0.1:7000

# Remove node
redis-cli --cluster del-node 127.0.0.1:7000 <node-id>

# Rebalance slots
redis-cli --cluster rebalance 127.0.0.1:7000 --cluster-use-empty-masters

# Connect to cluster (follow MOVED redirects)
redis-cli -c -h 127.0.0.1 -p 7000
```

## Sentinel Mode

```bash
# Connect to Sentinel
redis-cli -p 26379

# Common Sentinel commands
redis-cli -p 26379 SENTINEL masters
redis-cli -p 26379 SENTINEL replicas mymaster
redis-cli -p 26379 SENTINEL failover mymaster
```

## Replica Debug

```bash
# Simulate a replica connecting (for debugging replication)
redis-cli --replica
```

## Summary

redis-cli flags cover connection settings (-h, -p, -n, -u), authentication (--user, -a), output formatting (--raw, --csv), bulk operations (--pipe), and diagnostics (--bigkeys, --latency, --stat). The --cluster subcommand handles all cluster lifecycle operations from creation to resharding and health checks.
