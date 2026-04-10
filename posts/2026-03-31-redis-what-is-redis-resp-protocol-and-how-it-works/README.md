# What Is Redis RESP Protocol and How It Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RESP, Protocol

Description: Understand the Redis Serialization Protocol (RESP) - how commands and responses are encoded, what RESP3 adds, and how to inspect raw protocol messages.

---

RESP (Redis Serialization Protocol) is the wire protocol that Redis clients and servers use to communicate. It is simple, human-readable in its text form, and efficient to parse. Understanding RESP helps when debugging client issues, building custom clients, or analyzing Redis traffic.

## RESP2 Data Types

RESP2 encodes data using simple text prefixes:

- `+` Simple string: `+OK\r\n`
- `-` Error: `-ERR unknown command\r\n`
- `:` Integer: `:1000\r\n`
- `$` Bulk string: `$6\r\nfoobar\r\n`
- `*` Array: `*2\r\n$3\r\nfoo\r\n$3\r\nbar\r\n`

## How a Command Is Sent

When you run `SET mykey myvalue`, the client sends:

```text
*3\r\n
$3\r\n
SET\r\n
$5\r\n
mykey\r\n
$7\r\n
myvalue\r\n
```

And Redis responds with:

```text
+OK\r\n
```

## Inspecting RESP Traffic

Use `-3` with `redis-cli` to enable RESP3 protocol mode:

```bash
redis-cli --no-auth-warning -3 GET mykey
```

Or use `nc` to send raw RESP commands:

```bash
printf "*1\r\n\$4\r\nPING\r\n" | nc localhost 6379
```

## RESP3 - New in Redis 6.0

RESP3 adds new data types to eliminate the need for out-of-band documentation:

- Map type: key-value pairs (returned by HGETALL)
- Set type: unique elements
- Double type: floating point
- Blob error: structured error messages
- Null: explicit null (vs empty bulk string)

Enable RESP3 with the HELLO command:

```bash
redis-cli HELLO 3
```

Redis servers support both RESP2 and RESP3, and clients can negotiate which version to use at connection time via the HELLO command. Connections default to RESP2.

## Why RESP Is Efficient

RESP is designed for simplicity over efficiency in most cases. The binary-safe bulk string format handles arbitrary binary data without escaping. The simple prefix system makes it fast to parse without complex state machines.

## Building a Minimal RESP Client

A simple Python example of sending RESP and reading the response:

```python
import socket

def send_command(host, port, *args):
    sock = socket.socket()
    sock.connect((host, port))
    cmd = f"*{len(args)}\r\n"
    for arg in args:
        cmd += f"${len(arg)}\r\n{arg}\r\n"
    sock.send(cmd.encode())
    response = sock.recv(4096).decode()
    sock.close()
    return response

print(send_command("localhost", 6379, "SET", "hello", "world"))
print(send_command("localhost", 6379, "GET", "hello"))
```

## Summary

RESP is Redis's simple text-based wire protocol that encodes commands as arrays of bulk strings and responses using type-prefixed lines. RESP3, introduced in Redis 6.0, adds richer data types like maps and sets, reducing the need for client-side interpretation. Understanding RESP helps with debugging, building custom clients, and analyzing Redis network traffic.
