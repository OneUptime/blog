# How to Use RESET in Redis to Reset Connection State

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Reset, Connection Management, Transaction, Pub/Sub

Description: Learn how to use the RESET command in Redis to fully reset a connection's state, clearing transactions, subscriptions, and watches in one command.

---

## What Is the RESET Command?

`RESET` was introduced in Redis 6.2 as a way to return a connection to its default state without disconnecting. It is especially useful in connection pooling scenarios where a connection may be reused after leaving an inconsistent state.

## What RESET Does

Calling `RESET` on a connection performs all of the following:

- Cancels any active transaction (`DISCARD` if inside `MULTI`)
- Unsubscribes from all channels and patterns (like `UNSUBSCRIBE` + `PUNSUBSCRIBE`)
- Clears all `WATCH`ed keys (like `UNWATCH`)
- Resets the connection protocol to RESP2
- Resets the selected database to 0
- Deauthenticates the connection, requiring a call to `AUTH` to reauthenticate when authentication is enabled

## Basic Usage

```bash
redis-cli RESET
```

Returns:

```text
RESET
```

## Why RESET Matters for Connection Pools

Without `RESET`, a pooled connection returned in a bad state could cause problems:

```text
- Connection left inside MULTI block -> next user gets "ERR MULTI calls can not be nested"
- Connection subscribed to a channel -> next user cannot issue normal commands
- Connection watching a key -> unexpected MULTI/EXEC behavior
```

`RESET` solves all of these in one atomic call.

## Example: Resetting After a Failed Transaction

```bash
redis-cli
127.0.0.1:6379> MULTI
OK
127.0.0.1:6379> SET foo bar
QUEUED
# Something goes wrong, we want to reuse this connection
127.0.0.1:6379> RESET
RESET
# Connection is clean now
127.0.0.1:6379> GET foo
(nil)
```

## Example: Resetting After Pub/Sub

```bash
127.0.0.1:6379> SUBSCRIBE news
Reading messages... (press Ctrl-C to quit)
# Press Ctrl-C or send RESET
127.0.0.1:6379> RESET
RESET
# Normal command mode restored
127.0.0.1:6379> SET key value
OK
```

## RESET vs QUIT vs Individual Reset Commands

| Approach | Disconnects | Resets State | Overhead |
|---------|------------|-------------|---------|
| `QUIT` | Yes | Yes | Reconnect needed |
| `DISCARD` + `UNSUBSCRIBE` + `UNWATCH` | No | Partial | Multiple round trips |
| `RESET` | No | Full | Single round trip |

`RESET` is the most efficient way to fully clean a connection without disconnecting.

## Using RESET in Client Libraries

When building a connection pool, call `RESET` before returning a connection to the pool:

```python
def return_to_pool(conn):
    conn.execute_command('RESET')
    pool.put(conn)
```

## Summary

`RESET` is a comprehensive cleanup command that restores a Redis connection to its pristine state. It is indispensable for connection pooling, where connections may be reused after transactions, subscriptions, or watches - all cleared in a single round trip without disconnection.
