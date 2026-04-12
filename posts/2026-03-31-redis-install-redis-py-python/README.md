# How to Install and Set Up redis-py in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Python, redis-py, Setup, Client

Description: Install and configure the redis-py client library in Python, connect to a Redis server, and verify the setup with basic get and set operations.

---

`redis-py` is the official Python client for Redis. It supports all Redis commands, connection pooling, Pub/Sub, Streams, and the Redis Stack modules. This guide walks through installation, first connection, and basic usage.

## Installation

Install from PyPI using pip:

```bash
pip install redis
```

For async support (covered separately), the package is the same - no extra install is needed.

Optionally, install the `hiredis` C parser for faster response parsing:

```bash
pip install "redis[hiredis]"
```

The `hiredis` parser speeds up response parsing by 2-5x in throughput-heavy applications.

## Verifying the Install

```python
import redis
print(redis.__version__)
```

## Basic Connection

```python
import redis

r = redis.Redis(
    host="localhost",
    port=6379,
    db=0,
    decode_responses=True,  # Return str instead of bytes
)

# Test connectivity
print(r.ping())  # True
```

`decode_responses=True` makes all responses return Python strings. Without it, commands return `bytes`.

## Connecting with a URL

```python
r = redis.Redis.from_url("redis://localhost:6379/0")

# With password
r = redis.Redis.from_url("redis://:yourpassword@localhost:6379/0")

# With TLS
r = redis.Redis.from_url("rediss://localhost:6380/0")
```

## First Commands

```python
# Strings
r.set("greeting", "hello world")
print(r.get("greeting"))  # hello world

# With TTL
r.set("token", "abc123", ex=300)  # Expires in 300 seconds
print(r.ttl("token"))  # ~300

# Integer increment
r.set("counter", 0)
r.incr("counter")
r.incr("counter")
print(r.get("counter"))  # 2

# Check existence
print(r.exists("greeting"))  # 1
print(r.exists("missing"))   # 0

# Delete
r.delete("greeting")
```

## Environment-Based Configuration

Hardcoding connection details is a bad practice. Use environment variables:

```python
import os
import redis

r = redis.Redis(
    host=os.getenv("REDIS_HOST", "localhost"),
    port=int(os.getenv("REDIS_PORT", 6379)),
    password=os.getenv("REDIS_PASSWORD", ""),
    db=int(os.getenv("REDIS_DB", 0)),
    decode_responses=True,
)
```

## Checking Server Info

```python
info = r.info()
print(info["redis_version"])       # e.g. 7.2.4
print(info["used_memory_human"])   # e.g. 2.45M
print(info["connected_clients"])   # e.g. 3
```

## Using requirements.txt or pyproject.toml

Add to `requirements.txt`:

```text
redis>=5.0.0
```

Or in `pyproject.toml`:

```text
[project]
dependencies = [
  "redis>=5.0.0",
]
```

## Summary

Installing redis-py is a single `pip install redis` command. Connect using `redis.Redis()` or `Redis.from_url()` with `decode_responses=True` to work with strings instead of bytes. Always read connection credentials from environment variables and optionally install `hiredis` for faster response parsing in high-throughput applications.
