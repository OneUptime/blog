# How to Debug ClickHouse Keeper Issues with clickhouse-keeper-client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Debugging, Operation, CLI

Description: Learn how to use clickhouse-keeper-client to inspect, navigate, and debug the Keeper data tree directly, and how to diagnose common replication coordination issues.

`clickhouse-keeper-client` is an interactive CLI for ClickHouse Keeper. It connects directly to the Keeper port and lets you browse the data tree, inspect node values, create and delete nodes, and run diagnostic commands. It is the primary tool for debugging coordination issues that are not visible through ClickHouse's system tables.

## Connecting to Keeper

```bash
# Basic connection
clickhouse-keeper-client \
    --host keeper1.internal \
    --port 2181

# Connect with a specific timeout (values are in seconds)
clickhouse-keeper-client \
    --host keeper1.internal \
    --port 2181 \
    --connection-timeout 5 \
    --session-timeout 30

# Run a single command and exit (useful for scripts)
clickhouse-keeper-client \
    --host keeper1.internal \
    --port 2181 \
    --query "ls /clickhouse/tables"
```

## Basic Navigation Commands

Inside the client, these commands let you navigate the tree:

```text
ls [path]              -- list children of a node
cd [path]              -- change current path
get [path]             -- get the value of a node
get_stat [path]        -- show metadata for a node (ctime, mtime, version, etc)
set [path] [value]     -- set the value of a node
create [path] [value]  -- create a new node
touch [path]           -- create a new empty node
rm [path]              -- remove a node (must have no children)
rmr [path]             -- recursively remove a node and all its children
exists [path]          -- check if a node exists (returns 0 or 1)
sync [path]            -- sync the node from leader (forces latest data)
flwc [command]         -- run a four-letter-word command
help                   -- list all available commands
```

## Exploring the Replication Tree

Start with the top-level structure:

```text
> ls /clickhouse
tables
task_queue

> ls /clickhouse/tables
01
02

> ls /clickhouse/tables/01
events
orders
users

> ls /clickhouse/tables/01/events
blocks
columns
leader_election
log
metadata
mutations
nonincrement_block_numbers
part_moves_between_shards_orchestrator
quorum
replicas
temp
```

Inspect replica registrations:

```text
> ls /clickhouse/tables/01/events/replicas
ch1.internal
ch2.internal

> ls /clickhouse/tables/01/events/replicas/ch1.internal
columns
flags
host
is_active
is_lost
log_pointer
max_processed_insert_time
metadata
metadata_version
min_unprocessed_insert_time
mutation_pointer
parts
queue
```

## Checking Replica Liveness

```text
> exists /clickhouse/tables/01/events/replicas/ch1.internal/is_active
1

> get /clickhouse/tables/01/events/replicas/ch1.internal/is_active
1

> get_stat /clickhouse/tables/01/events/replicas/ch1.internal/is_active
cZxid = 0x1234
mZxid = 0x1234
ctime = 2026-03-31 10:00:00
mtime = 2026-03-31 10:00:00
pZxid = 0x1234
cversion = 0
dataVersion = 0
aclVersion = 0
ephemeralOwner = 0x0000000000000001
dataLength = 1
numChildren = 0
```

`ephemeralOwner` being non-zero means this is an ephemeral node held by an active session. If the replica crashes, this node disappears automatically when the ZooKeeper session expires.

## Inspecting the Replication Log

```text
> ls /clickhouse/tables/01/events/log
log-0000000001
log-0000000002
log-0000000003

> get /clickhouse/tables/01/events/log/log-0000000001
format version: 4
create_time: 2026-03-31 10:00:00
source replica: ch1.internal
block_id: 20240101_0000000001_0000000001_0
get_or_create part all_0_0_0

> get /clickhouse/tables/01/events/log/log-0000000002
format version: 4
create_time: 2026-03-31 10:01:00
source replica: ch1.internal
merge parts all_0_0_0 all_1_1_0 into all_0_1_1
```

## Checking a Replica's Log Pointer

The log pointer tells you which log entry the replica last processed:

```text
> get /clickhouse/tables/01/events/replicas/ch1.internal/log_pointer
3

> ls /clickhouse/tables/01/events/log
log-0000000001
log-0000000002
log-0000000003
```

If the log pointer for a replica is `1` and the log has entries up to `1000`, that replica is 999 entries behind. Cross-reference with `system.replicas.absolute_delay` to understand the time lag.

## Diagnosing a Missing Replica

If `system.replicas` shows a replica as inactive, check directly in Keeper:

```text
> ls /clickhouse/tables/01/events/replicas
ch1.internal
ch2.internal

> exists /clickhouse/tables/01/events/replicas/ch2.internal/is_active
0
```

`exists` returns `0` means the `is_active` ephemeral node is gone, confirming `ch2.internal` is disconnected from Keeper.

## Removing a Dead Replica

When a replica is permanently decommissioned, remove its Keeper nodes to keep the tree clean:

```text
> rmr /clickhouse/tables/01/events/replicas/old-ch-server.internal
```

Or use the SQL command from ClickHouse (safer, handles the cleanup properly):

```sql
SYSTEM DROP REPLICA 'old-ch-server.internal' FROM TABLE database.events;
```

## Checking the DDL Task Queue

```text
> ls /clickhouse/task_queue/ddl
query-0000000001
query-0000000002

> get /clickhouse/task_queue/ddl/query-0000000001
version: 1
query: CREATE TABLE IF NOT EXISTS events ON CLUSTER production_cluster ...
initiator: ch1.internal:9000
query_create_time: 2026-03-31 10:00:00
cluster: production_cluster
shard: 01
hosts:
  ch1.internal:9000
  ch2.internal:9000

> ls /clickhouse/task_queue/ddl/query-0000000001
active
finished
```

Check which hosts have finished a DDL task:

```text
> ls /clickhouse/task_queue/ddl/query-0000000001/finished
ch1.internal:9000
```

If `ch2.internal:9000` is not in the `finished` list, that host has not yet executed the DDL.

## Running Diagnostic Queries in the Client

You can run four-letter-word commands from inside the client using `flwc`, and you can take a snapshot via the `csnp` four-letter word:

```text
> flwc ruok
imok

> flwc csnp
100

> help
Available commands:
  ls [path]         List children of the given node
  cd [path]         Change current path
  get [path]        Get value of the given node
  ...
```

## Using Four-Letter Commands

In addition to `clickhouse-keeper-client`, the four-letter word protocol is useful for quick health checks:

```bash
# Is the server alive?
echo "ruok" | nc keeper1.internal 2181
# imok

# Server statistics
echo "stat" | nc keeper1.internal 2181

# Detailed monitoring stats (key/value pairs prefixed with zk_)
echo "mntr" | nc keeper1.internal 2181 | grep -E "zk_avg|zk_max|zk_out"

# List connected clients
echo "cons" | nc keeper1.internal 2181

# Server configuration
echo "conf" | nc keeper1.internal 2181

# Server stats — includes the Mode line (leader, follower, or standalone)
echo "srvr" | nc keeper1.internal 2181 | grep -i mode

# Dump all ephemeral nodes (shows all active sessions)
echo "dump" | nc keeper1.internal 2181

# Raft log info (zxid, last committed, snapshot indexes)
echo "lgif" | nc keeper1.internal 2181
```

## Troubleshooting Common Issues

**Issue: ClickHouse can connect to Keeper but replication is not working**

```bash
# Check if the ZooKeeper path exists
clickhouse-keeper-client --host keeper1.internal --port 2181 \
    --query "ls /clickhouse/tables/01/events"

# If it returns "Node does not exist", the table was never properly created
# Re-create the table with ReplicatedMergeTree on the affected node
```

**Issue: Duplicate replica name entries**

```bash
# List replicas and look for duplicates or stale entries
clickhouse-keeper-client --host keeper1.internal --port 2181 \
    --query "ls /clickhouse/tables/01/events/replicas"

# Remove the stale replica entry
clickhouse-keeper-client --host keeper1.internal --port 2181 \
    --query "rmr /clickhouse/tables/01/events/replicas/stale-host.internal"
```

**Issue: Keeper not accepting the connection**

```bash
# Check if Keeper is listening
ss -tlnp | grep 2181

# Check Keeper logs
journalctl -u clickhouse-keeper -n 50 | grep -i "error\|warning\|exception"

# Check if a firewall is blocking the port
iptables -L INPUT -n | grep 2181
```
