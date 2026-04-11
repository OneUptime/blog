# How to Use CLIENT SETINFO in Redis to Set Client Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CLIENT SETINFO, Connection Management, Observability, Client Library

Description: Learn how to use CLIENT SETINFO in Redis to attach metadata like library name and version to your client connection for better observability.

---

## What Is CLIENT SETINFO?

`CLIENT SETINFO` lets you annotate an active Redis connection with metadata fields. This is especially useful when running multiple applications against the same Redis instance - you can label each connection with its library name, version, or application identifier.

Redis supports two fields via `CLIENT SETINFO`:

- `LIB-NAME` - the client library name (e.g., `redis-py`, `ioredis`)
- `LIB-VER` - the client library version (e.g., `4.6.0`)

## Basic Syntax

```text
CLIENT SETINFO <field> <value>
```

Where `field` is either `LIB-NAME` or `LIB-VER`.

## Setting Library Name and Version

```bash
redis-cli CLIENT SETINFO LIB-NAME redis-py
redis-cli CLIENT SETINFO LIB-VER 4.6.0
```

Both commands return `OK` on success.

## Viewing the Metadata

After setting the info, you can verify it with `CLIENT INFO`:

```bash
redis-cli CLIENT INFO
```

The output includes fields like:

```text
id=7 addr=127.0.0.1:52301 ... lib-name=redis-py lib-ver=4.6.0 ...
```

You can also see all connected clients with their metadata using `CLIENT LIST`:

```bash
redis-cli CLIENT LIST
```

## Why This Matters for Production Systems

In production, multiple services connect to Redis simultaneously. Without labeling, you only see IP addresses and port numbers when debugging. With `CLIENT SETINFO`, operators can:

- Identify which service is holding idle connections
- Correlate Redis connection issues with specific application versions
- Detect outdated library versions still connecting to the cluster

## Auto-Setting by Modern Client Libraries

Modern Redis clients (redis-py 4.x+, ioredis 5.x+) automatically call `CLIENT SETINFO` during connection setup. If you are using an older client, you can set this manually after connecting:

```python
import redis

r = redis.Redis(host='localhost', port=6379)
r.client_setinfo('LIB-NAME', 'myapp')
r.client_setinfo('LIB-VER', '1.2.3')
```

## Restrictions

- Only the two fields `LIB-NAME` and `LIB-VER` are supported
- Values must not contain spaces, newlines, or non-printable characters
- The command was introduced in Redis 7.2

## Summary

`CLIENT SETINFO` is a lightweight but powerful observability tool in Redis. By tagging connections with library names and versions, teams gain better visibility into what is connecting to Redis and why - making debugging, auditing, and capacity planning much easier.
