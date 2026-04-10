# How the RESP (Redis Serialization Protocol) Works

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RESP, Protocol, Serialization, Network

Description: Learn how the Redis Serialization Protocol (RESP) encodes commands and responses, covering data types, wire format, and the differences between RESP2 and RESP3.

---

RESP (Redis Serialization Protocol) is the wire protocol Redis uses for client-server communication. It is a simple, text-based protocol optimized for fast parsing and human readability during debugging.

## RESP Data Types

RESP2 (used by most Redis clients) defines five data types, each starting with a specific prefix byte:

```text
+ Simple String  (e.g., +OK\r\n)
- Error          (e.g., -ERR wrong number of arguments\r\n)
: Integer        (e.g., :1000\r\n)
$ Bulk String    (e.g., $6\r\nfoobar\r\n)
* Array          (e.g., *3\r\n...)
```

## Wire Format Examples

**Simple String** - used for simple acknowledgments:

```text
+OK\r\n
```

**Error** - used for error responses:

```text
-ERR unknown command 'FOO'\r\n
-WRONGTYPE Operation against a key holding the wrong kind of value\r\n
```

**Integer** - used for numeric responses:

```text
:42\r\n
```

**Bulk String** - used for binary-safe strings. Starts with `$<length>`:

```text
$5\r\nhello\r\n

# Null bulk string (Redis nil)
$-1\r\n
```

**Array** - used for multi-value responses. Starts with `*<count>`:

```text
*3\r\n
$3\r\nfoo\r\n
$3\r\nbar\r\n
$3\r\nbaz\r\n
```

## How a Command Is Encoded

When you run `SET mykey hello`, the client encodes it as a RESP array:

```text
*3\r\n
$3\r\nSET\r\n
$5\r\nmykey\r\n
$5\r\nhello\r\n
```

The server responds with a simple string:

```text
+OK\r\n
```

## Inspecting RESP with netcat

You can see raw RESP traffic by talking directly to Redis:

```bash
# Send a PING command manually
printf "*1\r\n\$4\r\nPING\r\n" | nc localhost 6379
# Response: +PONG

# Send SET key value
printf "*3\r\n\$3\r\nSET\r\n\$3\r\nfoo\r\n\$3\r\nbar\r\n" | nc localhost 6379
# Response: +OK
```

## Parsing RESP in Python

A minimal RESP parser to understand the protocol:

```python
import socket

def parse_resp(data):
    lines = data.split(b'\r\n')
    prefix = chr(lines[0][0])

    if prefix == '+':
        return lines[0][1:].decode()       # Simple string
    elif prefix == '-':
        raise Exception(lines[0][1:].decode())  # Error
    elif prefix == ':':
        return int(lines[0][1:])           # Integer
    elif prefix == '$':
        length = int(lines[0][1:])
        if length == -1:
            return None                    # Null
        return lines[1][:length].decode() # Bulk string
    elif prefix == '*':
        count = int(lines[0][1:])
        if count == -1:
            return None                    # Null array
        # Parse sub-elements (simplified)
        return [lines[i*2+2].decode() for i in range(count)]

def send_command(host, port, *args):
    cmd = f"*{len(args)}\r\n"
    for arg in args:
        cmd += f"${len(arg)}\r\n{arg}\r\n"

    with socket.create_connection((host, port)) as s:
        s.sendall(cmd.encode())
        return s.recv(4096)

response = send_command('localhost', 6379, 'GET', 'foo')
print(parse_resp(response))
```

## RESP3 - New in Redis 6.0

RESP3 adds new data types for richer communication:

```text
% Map          (dictionary responses, used by HGETALL in RESP3)
~ Set          (set responses)
> Push         (server-pushed data, used by CLIENT TRACKING)
, Double
# Boolean
( Big number
```

Enable RESP3 with the `HELLO` command:

```bash
HELLO 3
# Server responds with a Map containing server metadata
```

RESP3 reduces client-side parsing complexity: `HGETALL` returns a Map in RESP3 instead of a flat array that the client must pair up.

```bash
# RESP2: flat array needing client-side pairing
HGETALL myhash
# 1) "field1"
# 2) "value1"

# RESP3: returns a proper Map type
HGETALL myhash
# {"field1": "value1"}
```

## Summary

RESP is a simple line-oriented protocol where each value is prefixed with a type byte and terminated with `\r\n`. Commands are encoded as arrays of bulk strings. RESP3, available since Redis 6.0, extends RESP2 with richer types like Maps, Sets, and Push messages, reducing the parsing burden on clients and enabling server-initiated messages used by client-side caching.
