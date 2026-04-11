# How to Use HELLO in Redis for Protocol Negotiation (RESP3)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, HELLO, RESP3, Protocol Negotiation, Connection Management

Description: Learn how to use the HELLO command in Redis to negotiate the RESP3 protocol, get server info, and authenticate in a single round trip.

---

## What Is the HELLO Command?

The `HELLO` command was introduced in Redis 6.0 to enable protocol negotiation between client and server. It lets clients switch between RESP2 (the legacy protocol) and RESP3 (the newer protocol with richer data types like maps and sets).

`HELLO` also doubles as a handshake command - returning server information and optionally authenticating in a single call.

## Basic Syntax

```text
HELLO [protover [AUTH username password] [SETNAME clientname]]
```

All arguments are optional. Since Redis 6.2, calling `HELLO` with no arguments returns current connection info without changing the protocol. (In Redis 6.0 and 6.1, the `protover` argument was required.)

## Getting Current Connection Info

```bash
redis-cli HELLO
```

Example output (as displayed by redis-cli):

```text
1) "server"
2) "redis"
3) "version"
4) "7.2.0"
5) "proto"
6) (integer) 2
7) "id"
8) (integer) 15
9) "mode"
10) "standalone"
11) "role"
12) "master"
13) "modules"
14) (empty array)
```

## Switching to RESP3

```bash
redis-cli HELLO 3
```

After this, the server sends responses as rich RESP3 types like maps and doubles instead of arrays of bulk strings.

## Switching Back to RESP2

```bash
redis-cli HELLO 2
```

## Authenticating with HELLO

You can authenticate and negotiate the protocol in one command:

```bash
redis-cli HELLO 3 AUTH default mypassword
```

This is more efficient than sending `AUTH` separately.

## Setting a Client Name at Handshake

```bash
redis-cli HELLO 3 AUTH default mypassword SETNAME my-app-worker
```

This sets the client name visible in `CLIENT LIST`, helping with debugging.

## RESP3 Advantages

RESP3 adds native support for:

- Maps (instead of flat arrays of key-value pairs)
- Sets (deduplicated values)
- Doubles (native floating point)
- Verbatim strings (with encoding hint)
- Push messages (for pub/sub and keyspace notifications)

Modern clients like redis-py (5.0+) support RESP3, but it must be explicitly enabled (e.g., by passing `protocol=3`). The default remains RESP2.

## Using HELLO in Application Code

```python
import redis

r = redis.Redis(host='localhost', port=6379, protocol=3)
# redis-py automatically sends HELLO 3 during handshake
info = r.hello()
print(info['version'])
```

## When to Use HELLO

- When building a custom Redis client and need to negotiate protocol
- When authenticating and setting connection metadata in one round trip
- When checking what protocol version a connection is currently using
- When connecting to Redis Sentinel or Cluster to confirm server mode and role

## Summary

`HELLO` is Redis's modern handshake command, enabling RESP3 protocol negotiation, authentication, and client naming in a single round trip. Upgrading to RESP3 gives richer native data types and push message support, making it the preferred protocol for new Redis client implementations.
