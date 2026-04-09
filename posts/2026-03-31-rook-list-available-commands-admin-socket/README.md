# How to List Available Commands via Admin Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Admin Socket, Command, Debug, Operation

Description: List and explore available commands on any Ceph daemon admin socket to discover diagnostics, configuration, and performance tools for live daemon inspection.

---

## Overview

Each Ceph daemon exposes a rich set of commands through its admin socket. The `help` command lists everything available as a JSON object (keys are command names, values are descriptions), and the output varies by daemon type. Knowing how to explore available commands is the first step to effective live daemon management.

## Getting the Full Command List

```bash
# List all commands for an OSD
ceph daemon osd.0 help

# List commands for a MON
ceph daemon mon.$(hostname) help

# List commands for RGW
ceph daemon rgw.myzone help

# List commands for MDS
ceph daemon mds.$(hostname) help

# List commands for MGR
ceph daemon mgr.$(hostname) help
```

## Filtering Commands by Category

The help output can be filtered to find relevant commands:

```bash
# Find all config-related commands
ceph daemon osd.0 help | grep config

# Find performance counter commands
ceph daemon osd.0 help | grep perf

# Find log-related commands
ceph daemon osd.0 help | grep log
```

## Common Command Categories

### Configuration Commands
```bash
# View all config-related commands (help returns JSON, so match quoted keys)
ceph daemon osd.0 help | grep '"config'
# Typical output includes:
# "config diff": "dump diff of current config and default config"
# "config get": "config get <var>: ..."
# "config help": "get config setting schema and descriptions"
# "config set": "config set <var> <val>: ..."
# "config show": "dump current config settings"
```

### Performance Counter Commands
```bash
# View perf counter commands
ceph daemon osd.0 help | grep '"perf'
# Typical output includes:
# "perf dump": "dump perfcounters value"
# "perf histogram dump": "dump perf histogram values"
# "perf histogram schema": "dump perf histogram schema"
# "perf reset": "perf reset <name>: ..."
# "perf schema": "dump perfcounters schema"
```

### Log Commands
```bash
ceph daemon osd.0 help | grep '"log'
# Typical output includes:
# "log flush": "flush log entries to log file"
# "log reopen": "reopen log file"
```

## Exploring Commands with JSON Output

Many admin socket commands return JSON, which you can parse:

```bash
# Parse the JSON help output to list commands
ceph daemon osd.0 help | python3 -c "
import sys, json
commands = json.load(sys.stdin)
print(f'Total commands available: {len(commands)}')
for cmd in sorted(commands.keys())[:20]:
    print(f'  {cmd}')
"
```

## OSD-Specific Commands

```bash
# List OSD-specific commands
ceph daemon osd.0 help | grep -E '"(dump_|flush_|get_latest)'

# Key OSD commands:
# dump_historic_ops        - show recent ops
# dump_ops_in_flight       - show current in-flight operations
# dump_watchers            - show object watch/notify state
# flush_journal            - flush the journal (FileStore only)
# get_latest_osdmap        - force osd to update the latest map from the mon
```

## RGW-Specific Commands

```bash
# List RGW admin socket commands
ceph daemon rgw.myzone help | grep -v "^#"

# Key RGW commands:
# perf dump                - performance counters including D3N
# config get <key>         - view config value
# cache list               - list RGW internal caches
# cache inspect            - inspect cache details
```

## Scripting Command Discovery

```bash
# Build a command inventory for all daemons
for socket in /var/run/ceph/*.asok; do
    daemon=$(basename $socket .asok)
    echo "=== $daemon ==="
    ceph --admin-daemon $socket help 2>/dev/null | wc -l
    echo "commands available"
done
```

## Summary

The `help` command on any Ceph admin socket lists all available commands for that daemon type. Filter the output with grep to find commands by category - config, perf, log, and dump are the most commonly used categories. Build familiarity with each daemon's command set before you need to use them in an incident, as the admin socket is one of the most powerful live diagnostic tools in Ceph.
