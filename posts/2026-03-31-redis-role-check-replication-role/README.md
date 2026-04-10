# How to Use ROLE in Redis to Check Replication Role

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Command

Description: Learn how to use the Redis ROLE command to inspect whether a node is a master, replica, or sentinel and get detailed replication state info.

---

The `ROLE` command in Redis returns the role of the current server instance in the context of replication. It is a lightweight introspection tool that tells you whether you are connected to a master, a replica (slave), or a sentinel node - along with relevant replication metadata.

## Basic Syntax

```bash
ROLE
```

No arguments are required. The output differs based on the node type.

## Master Node Response

When connected to a master, `ROLE` returns a list with three elements:

```bash
127.0.0.1:6379> ROLE
1) "master"
2) (integer) 12345678
3) 1) 1) "127.0.0.1"
      2) "6380"
      3) "12345670"
```

- Field 1: the string `"master"`
- Field 2: the current replication offset
- Field 3: a list of connected replicas, each with their IP, port, and last acknowledged offset

## Replica Node Response

When connected to a replica:

```bash
127.0.0.1:6380> ROLE
1) "slave"
2) "127.0.0.1"
3) (integer) 6379
4) "connected"
5) (integer) 12345678
```

- Field 1: `"slave"` (the internal term Redis uses)
- Field 2: master IP address
- Field 3: master port
- Field 4: replication state (`"connect"`, `"connecting"`, `"sync"`, or `"connected"`)
- Field 5: the amount of data the replica has received from the master

## Sentinel Node Response

When running Redis Sentinel:

```bash
127.0.0.1:26379> ROLE
1) "sentinel"
2) 1) "mymaster"
   2) "secondmaster"
```

The response includes the string `"sentinel"` followed by the list of master names monitored by this sentinel.

## Practical Example: Checking Role with redis-cli

```bash
redis-cli -h 10.0.0.1 -p 6379 ROLE
```

This is useful in health check scripts to dynamically determine whether you are reading from a master or replica before issuing write commands.

## Using ROLE in a Python Script

```python
import redis

r = redis.Redis(host="127.0.0.1", port=6379)
role_info = r.role()

role_name = role_info[0].decode()
print(f"Node role: {role_name}")

if role_name == "master":
    replicas = role_info[2]
    print(f"Connected replicas: {len(replicas)}")
elif role_name == "slave":
    master_host = role_info[1].decode()
    master_port = role_info[2]
    state = role_info[3].decode()
    print(f"Master: {master_host}:{master_port}, State: {state}")
```

## Use Cases

- **Health checks**: Validate which node a client is currently connected to before writes
- **Monitoring scripts**: Alert when a replica loses its connection to the master
- **Failover automation**: Detect the current topology before triggering a manual failover
- **Debugging replication lag**: Compare the master offset against the replica offset

## ROLE vs INFO replication

`ROLE` is faster and simpler than `INFO replication` because it returns only the essential topology data. Use `ROLE` when you need a quick programmatic check. Use `INFO replication` when you need detailed statistics like lag in bytes.

```bash
# Quick role check
redis-cli ROLE

# Full replication stats
redis-cli INFO replication
```

## Summary

The `ROLE` command provides a concise view of a Redis node's position in the replication hierarchy. It returns different structured data for masters, replicas, and sentinel nodes, making it an ideal lightweight tool for health checks, automation scripts, and debugging replication topology.
