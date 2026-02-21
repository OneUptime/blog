# How to Use Ansible Ad Hoc Commands with Forks for Parallelism

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Parallelism, Performance Tuning

Description: Learn how to control parallel execution in Ansible ad hoc commands using forks, optimize for large inventories, and avoid common parallelism pitfalls.

---

By default, Ansible executes tasks on 5 hosts simultaneously. If you have 100 servers, that means 20 rounds of execution, with each round waiting for all 5 hosts to complete before starting the next batch. For simple tasks like checking uptime or pinging hosts, this default is painfully slow. The `-f` (forks) parameter lets you crank up the parallelism.

## Understanding Forks

Forks control how many host connections Ansible opens at the same time. Each fork is a separate process on the Ansible controller that handles one host connection.

```bash
# Default: 5 forks (5 hosts at a time)
ansible all -m ping
# With 100 hosts, this takes ~20 rounds

# 20 forks: 20 hosts at a time
ansible all -m ping -f 20
# With 100 hosts, this takes ~5 rounds

# 50 forks: 50 hosts at a time
ansible all -m ping -f 50
# With 100 hosts, this takes ~2 rounds

# Match the number of forks to your host count
ansible all -m ping -f 100
# With 100 hosts, this runs everything in 1 round
```

## Setting the Default in ansible.cfg

Instead of passing `-f` every time, set a default in your configuration:

```ini
# ansible.cfg
[defaults]
forks = 25
```

This applies to all ad hoc commands and playbooks unless overridden on the command line:

```bash
# Uses the default of 25 forks from ansible.cfg
ansible all -m ping

# Override for a specific command
ansible all -m ping -f 50
```

## Choosing the Right Fork Count

The optimal number of forks depends on several factors. Here is a practical guide:

```bash
# Small inventory (< 20 hosts): default is fine
ansible all -m ping

# Medium inventory (20-100 hosts): 20-50 forks
ansible all -m ping -f 30

# Large inventory (100-500 hosts): 50-100 forks
ansible all -m ping -f 75

# Very large inventory (500+ hosts): 100-200 forks
ansible all -m ping -f 150
```

Going above 200 forks is rarely beneficial and can cause problems. Each fork uses:
- One SSH connection to a remote host
- One process on the controller
- Memory for the module execution results
- File descriptors for the SSH session

## Measuring the Impact

Here is a quick way to see how forks affect performance:

```bash
# Time the command with default forks
time ansible all -m ping

# Time with increased forks
time ansible all -m ping -f 50

# Time with maximum forks
time ansible all -m ping -f 100
```

For a fleet of 60 servers running a simple ping:

```
# -f 5  (default):  ~24 seconds (12 rounds x ~2s each)
# -f 10:            ~12 seconds (6 rounds x ~2s each)
# -f 20:            ~6 seconds  (3 rounds x ~2s each)
# -f 60:            ~2 seconds  (1 round)
```

The speedup is roughly linear until you hit the controller's limits or network bottlenecks.

## Resource Limits on the Controller

Higher fork counts consume more resources on the controller machine. Check your limits before going high:

```bash
# Check the maximum number of open files (file descriptor limit)
ulimit -n
# Typical default: 1024

# Check the maximum number of processes
ulimit -u
# Typical default: varies by OS

# Each Ansible fork needs roughly 3-5 file descriptors
# So for 200 forks, you need at least 1000 file descriptors
```

If you hit file descriptor limits, increase them:

```bash
# Temporarily increase for the current session
ulimit -n 4096

# Or permanently in /etc/security/limits.conf
# deploy  soft  nofile  4096
# deploy  hard  nofile  8192
```

## When to Use Low Fork Counts

There are situations where you intentionally want fewer forks:

```bash
# Rolling restart: one host at a time to maintain availability
ansible webservers -m service -a "name=nginx state=restarted" --become -f 1

# Throttled database operations: avoid overwhelming the database
ansible appservers -m shell -a "cd /opt/app && rake db:migrate" -f 2

# Bandwidth-sensitive file transfers: avoid saturating the network
ansible all -m copy -a "src=./large_file.tar.gz dest=/tmp/" -f 3
```

### Rolling Updates Pattern

```bash
# Restart in small batches, checking health between batches
# Batch 1: first 3 servers
ansible webservers -m service -a "name=nginx state=restarted" --become -f 3 --limit 'web[1:3]'

# Verify health
ansible webservers -m shell -a "curl -s -o /dev/null -w '%{http_code}' http://localhost/" --limit 'web[1:3]'

# Batch 2: next 3 servers
ansible webservers -m service -a "name=nginx state=restarted" --become -f 3 --limit 'web[4:6]'
```

## Forks with Different Task Types

Different tasks benefit differently from increased parallelism:

```bash
# CPU-light tasks (ping, command, setup): high forks are fine
ansible all -m ping -f 100
ansible all -a "uptime" -f 100
ansible all -m setup -a "filter=ansible_hostname" -f 100

# I/O-heavy tasks (copy, synchronize): moderate forks
# The controller needs to read and transfer file data for each fork
ansible all -m copy -a "src=./bigfile dest=/tmp/bigfile" -f 20

# Network-dependent tasks (package install): moderate forks
# All hosts hitting package repos simultaneously can cause issues
ansible all -m apt -a "name=nginx state=present update_cache=yes" --become -f 15

# Database operations: low forks
# Avoid overwhelming connection pools
ansible appservers -m shell -a "psql -c 'VACUUM ANALYZE;'" --become --become-user=postgres -f 3
```

## Monitoring Fork Performance

You can observe what is happening on the controller during high-fork operations:

```bash
# In one terminal: run the Ansible command
ansible all -m setup -f 100

# In another terminal: watch the process count
watch "ps aux | grep ansible | wc -l"

# Or watch SSH connections
watch "ss -tn | grep ':22' | wc -l"

# Monitor memory usage during the operation
watch "free -m"
```

## Combining Forks with Other Performance Settings

Forks work alongside other Ansible performance settings:

```ini
# ansible.cfg - Optimized for large inventories
[defaults]
forks = 50

# Use SSH pipelining (reduces SSH operations per task)
[ssh_connection]
pipelining = True

# Use persistent connections (reuse SSH connections)
ssh_args = -o ControlMaster=auto -o ControlPersist=60s

# Increase the connection timeout for slow hosts
timeout = 30
```

```bash
# SSH pipelining with high forks gives the best performance
# Enable it via environment variable if not in ansible.cfg
ANSIBLE_PIPELINING=true ansible all -m ping -f 100
```

## Handling Timeouts with High Forks

When you increase forks, some hosts may time out because the controller is handling too many connections:

```bash
# Increase the SSH connection timeout when using many forks
ansible all -m ping -f 100 -T 60

# Or set it in ansible.cfg
# [defaults]
# timeout = 60

# You can also increase the command timeout for long-running operations
ansible all -m shell -a "find / -name '*.log' -mtime +30" -f 50 -e "ansible_command_timeout=300"
```

## Practical Script: Auto-Scaling Forks

Here is a script that automatically adjusts forks based on your inventory size:

```bash
#!/bin/bash
# auto_forks.sh - Run Ansible with forks scaled to inventory size
# Usage: ./auto_forks.sh <inventory> <module> <args>

INVENTORY=$1
MODULE=$2
ARGS=$3

# Count hosts in inventory
HOST_COUNT=$(ansible all -i "$INVENTORY" --list-hosts 2>/dev/null | tail -n +2 | wc -l | tr -d ' ')

# Calculate forks (minimum 5, maximum 150, or host count)
if [ "$HOST_COUNT" -lt 5 ]; then
    FORKS=5
elif [ "$HOST_COUNT" -gt 150 ]; then
    FORKS=150
else
    FORKS=$HOST_COUNT
fi

echo "Running with $FORKS forks for $HOST_COUNT hosts"
ansible all -i "$INVENTORY" -m "$MODULE" -a "$ARGS" -f "$FORKS"
```

## Summary

The `-f` (forks) parameter is the simplest way to speed up Ansible ad hoc commands across large inventories. Set it high (50-100) for lightweight read-only tasks like ping and uptime checks. Keep it moderate (15-30) for I/O-heavy operations like file copies and package installs. Drop it low (1-5) for operations that need careful sequencing like rolling restarts or database migrations. Configure a sensible default in ansible.cfg, combine it with SSH pipelining for maximum throughput, and monitor your controller's resources to find the sweet spot for your environment.
