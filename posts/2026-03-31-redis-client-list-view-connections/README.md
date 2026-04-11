# How to Use CLIENT LIST in Redis to View Connected Clients

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Client, Monitoring, Connection, Administration

Description: Learn how to use Redis CLIENT LIST to inspect all active client connections, their state, and resource usage for monitoring and debugging.

---

The `CLIENT LIST` command returns detailed information about every client currently connected to the Redis server. It is one of the most useful commands for diagnosing connection issues, identifying idle clients, and monitoring resource consumption per connection.

## Basic Usage

```bash
127.0.0.1:6379> CLIENT LIST
id=3 addr=127.0.0.1:52340 laddr=127.0.0.1:6379 fd=8 name= age=0 idle=0 flags=N db=0 sub=0 psub=0 ssub=0 multi=-1 watch=0 qbuf=26 qbuf-free=20448 argv-mem=10 multi-mem=0 tot-mem=22298 rbs=16384 rbp=16384 obl=0 oll=0 omem=0 events=r cmd=client|list user=default library-name= library-ver= resp=2
id=4 addr=127.0.0.1:52341 laddr=127.0.0.1:6379 fd=9 name=worker-1 age=120 idle=30 flags=N db=0 sub=0 psub=0 ssub=0 multi=-1 watch=0 qbuf=0 qbuf-free=0 argv-mem=0 multi-mem=0 tot-mem=22298 rbs=16384 rbp=0 obl=0 oll=0 omem=0 events=r cmd=get user=app_user library-name= library-ver= resp=2
```

## Filtering by Client Type

The `TYPE` option filters output by connection type:

```bash
# Show only normal clients (not replicas or pub/sub)
127.0.0.1:6379> CLIENT LIST TYPE normal

# Show only replica connections
127.0.0.1:6379> CLIENT LIST TYPE replica

# Show only pub/sub subscribers
127.0.0.1:6379> CLIENT LIST TYPE pubsub

# Show only master connections (replication link from master)
127.0.0.1:6379> CLIENT LIST TYPE master
```

## Filtering by Client ID

To inspect specific clients by their ID:

```bash
127.0.0.1:6379> CLIENT LIST ID 3 4 7
```

## Understanding Key Fields

The output fields are dense but informative:

```text
Field     | Meaning
----------|------------------------------------------------
id        | Unique client ID (monotonically increasing)
addr      | Client IP and port
name      | Name set via CLIENT SETNAME (empty if not set)
age       | Connection age in seconds
idle      | Seconds since last command
flags     | Connection flags (N=normal, S=replica, P=pubsub, etc.)
db        | Current database index
sub       | Number of channel subscriptions
psub      | Number of pattern subscriptions
cmd       | Last command executed
user      | ACL user associated with this connection
qbuf      | Input query buffer size
omem      | Output buffer memory used
tot-mem   | Total memory consumed by this client
```

## Finding Long-Idle Connections

Identify clients that have been idle for too long:

```bash
#!/bin/bash
# Find clients idle for more than 5 minutes (300 seconds)
redis-cli CLIENT LIST | awk -F' ' '{
  for(i=1;i<=NF;i++) {
    if($i ~ /^idle=/) {
      split($i, a, "=")
      if(a[2]+0 > 300) print $0
    }
  }
}'
```

## Monitoring Memory Per Client

Clients with large output buffers can indicate slow consumers:

```bash
#!/bin/bash
# Show clients with omem > 1MB
redis-cli CLIENT LIST | awk -F' ' '{
  for(i=1;i<=NF;i++) {
    if($i ~ /^omem=/) {
      split($i, a, "=")
      if(a[2]+0 > 1048576) print "HIGH OMEM:", $0
    }
  }
}'
```

## Checking Client Count

For a quick count of connected clients:

```bash
127.0.0.1:6379> INFO clients
# Clients
connected_clients:2
cluster_connections:0
maxclients:10000
client_recent_max_input_buffer:20480
client_recent_max_output_buffer:0
```

## Identifying Clients Without Names

Unnamed clients make debugging harder. Find them and investigate:

```bash
redis-cli CLIENT LIST | grep "name= " | wc -l
```

Encourage all application connections to set a name via `CLIENT SETNAME` so they appear clearly in `CLIENT LIST` output.

## Scripting Connection Audits

```bash
#!/bin/bash
echo "=== Redis Connection Audit ==="
echo "Total connections:"
redis-cli CLIENT LIST | wc -l

echo ""
echo "Connections by user:"
redis-cli CLIENT LIST | grep -o 'user=[^ ]*' | sort | uniq -c | sort -rn

echo ""
echo "Connections by last command:"
redis-cli CLIENT LIST | grep -o 'cmd=[^ ]*' | sort | uniq -c | sort -rn
```

## Summary

`CLIENT LIST` is the go-to command for understanding what is happening at the connection level in Redis. By regularly reviewing connected clients, their idle time, memory usage, and command history, you can detect connection leaks, identify misbehaving consumers, and ensure your Redis server is operating efficiently.
