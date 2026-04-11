# How to Use ECHO in Redis for Connection Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Echo, Connection Testing, Debugging, CLI

Description: Learn how to use the ECHO command in Redis to echo a message back from the server, useful for verifying connection encoding and debugging.

---

## What Is the ECHO Command?

The `ECHO` command in Redis returns the exact string you send to it. Unlike `PING` which returns `PONG` by default (or a custom message if one is provided), `ECHO` always sends back exactly the message you pass - making it useful for testing specific string encoding, connection proxies, and middleware behavior.

## Basic Syntax

```text
ECHO message
```

Returns the message as a bulk string reply.

## Basic Usage

```bash
redis-cli ECHO "hello world"
```

Output:

```text
"hello world"
```

You can also send any arbitrary string:

```bash
redis-cli ECHO "test-payload-123"
```

```text
"test-payload-123"
```

## Difference Between ECHO and PING

| Command | Purpose | Response |
|---------|---------|---------|
| `PING` | Test if server is alive | `PONG` or custom message |
| `ECHO` | Reflect a specific message | Exact message sent |

`PING` is better for liveness checks in health scripts. `ECHO` is more useful when you want to verify that a specific string travels through the connection unchanged - for example, when testing encodings or proxies.

## Using ECHO to Test Proxies and Load Balancers

When Redis sits behind a proxy (like Envoy, HAProxy, or Twemproxy), `ECHO` helps verify the proxy is not mangling your payload:

```bash
redis-cli -h proxy-host -p 6380 ECHO "probe-string-abc"
```

If the output matches the input exactly, the proxy is passing data correctly.

## Testing Unicode and Special Characters

```bash
redis-cli ECHO $'cafe\xc3\xa9'
```

This sends the UTF-8 bytes for "café" and helps confirm your connection is handling multi-byte characters correctly.

## Using ECHO in Application Code

In Python with redis-py:

```python
import redis

r = redis.Redis(host='localhost', port=6379)
response = r.echo(b'test-message')
print(response)  # b'test-message'
```

## ECHO vs PING in Health Checks

For basic health checks, `PING` is preferred because it has lower overhead. Use `ECHO` when:

- You need to verify message integrity through a proxy
- You want to test a specific encoding path
- You are debugging data corruption issues on the connection layer

## Summary

`ECHO` is a simple but handy Redis command for verifying that specific messages travel through your connection layer without modification. While `PING` checks server liveness, `ECHO` validates the full round-trip integrity of a specific string - a subtle but important distinction when debugging proxy and encoding issues.
