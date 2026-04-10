# How to Parse RESP Protocol Responses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RESP, Protocol, Parsing

Description: Learn how to parse all RESP2 and RESP3 response types from Redis, including bulk strings, arrays, maps, and error handling edge cases.

---

Parsing Redis RESP responses correctly requires handling 5 RESP2 types and 10 additional RESP3 types. This guide covers the complete parsing logic with edge cases.

## RESP2 Type Reference

Every response starts with a single type byte followed by `\r\n`:

```text
+  Simple string: "+OK\r\n"
-  Error:         "-ERR unknown command 'foo'\r\n"
:  Integer:       ":42\r\n"
$  Bulk string:   "$5\r\nhello\r\n"  or  "$-1\r\n" (null)
*  Array:         "*3\r\n..."        or  "*-1\r\n" (null)
```

## Core Parser Implementation

```python
class RespParser:
    def __init__(self, stream):
        self.stream = stream  # file-like object, buffered

    def parse(self):
        line = self.stream.readline()
        if not line:
            raise EOFError("Connection closed")

        prefix = chr(line[0])
        payload = line[1:].rstrip(b"\r\n").decode()

        dispatch = {
            "+": self._simple_string,
            "-": self._error,
            ":": self._integer,
            "$": self._bulk_string,
            "*": self._array,
        }

        handler = dispatch.get(prefix)
        if not handler:
            raise ValueError(f"Unknown RESP type byte: {prefix!r}")
        return handler(payload)

    def _simple_string(self, data):
        return data

    def _error(self, data):
        # Prefix like "ERR" or "WRONGTYPE" comes before the message
        parts = data.split(" ", 1)
        raise RedisError(parts[1] if len(parts) > 1 else data)

    def _integer(self, data):
        return int(data)

    def _bulk_string(self, data):
        length = int(data)
        if length == -1:
            return None  # null bulk string
        value = self.stream.read(length)
        self.stream.read(2)  # discard trailing \r\n
        return value.decode()

    def _array(self, data):
        count = int(data)
        if count == -1:
            return None  # null array
        return [self.parse() for _ in range(count)]

class RedisError(Exception):
    pass
```

## Edge Cases to Handle

**Null bulk string vs empty string:**

```python
# "$-1\r\n" is null (key does not exist)
# "$0\r\n\r\n" is an empty string ""
assert parser._bulk_string("-1") is None
assert parser._bulk_string("0") == ""
```

**Nested arrays (multi-bulk):**

```text
*2\r\n
*3\r\n:1\r\n:2\r\n:3\r\n
*2\r\n+Hello\r\n-World error\r\n
```

The recursive `parse()` call in `_array` handles this naturally.

**Error subtypes:**

```python
# Redis prefixes errors with a code word
"-WRONGTYPE Operation against a key holding the wrong kind of value\r\n"
"-NOSCRIPT No matching script\r\n"
"-MOVED 3999 127.0.0.1:6380\r\n"  # cluster redirect
```

Parse the error code to handle cluster redirects:

```python
def _error(self, data):
    parts = data.split(" ", 1)
    code = parts[0]
    message = parts[1] if len(parts) > 1 else ""
    if code == "MOVED":
        slot, addr = message.split(" ")
        raise MovedError(int(slot), addr)
    raise RedisError(data)
```

## RESP3 Additional Types

For RESP3, extend the parser:

```python
RESP3_TYPES = {
    "_": "_null",
    "#": "_boolean",
    ",": "_double",
    "(": "_big_number",
    "!": "_blob_error",
    "=": "_verbatim_string",
    "%": "_map",
    "~": "_set_type",
    "|": "_attribute",
    ">": "_push",
}

def _map(self, data):
    count = int(data)
    result = {}
    for _ in range(count):
        key = self.parse()
        value = self.parse()
        result[key] = value
    return result

def _set_type(self, data):
    count = int(data)
    return {self.parse() for _ in range(count)}

def _boolean(self, data):
    return data == "t"

def _double(self, data):
    return float(data)

def _big_number(self, data):
    return int(data)

def _null(self, data):
    return None

def _blob_error(self, data):
    length = int(data)
    value = self.stream.read(length)
    self.stream.read(2)  # discard trailing \r\n
    raise RedisError(value.decode())

def _verbatim_string(self, data):
    length = int(data)
    value = self.stream.read(length)
    self.stream.read(2)  # discard trailing \r\n
    # Skip the 3-byte encoding prefix and colon (e.g., "txt:")
    return value[4:].decode()

def _attribute(self, data):
    count = int(data)
    # Parse and discard attribute metadata
    for _ in range(count):
        self.parse()  # key
        self.parse()  # value
    # The actual response follows the attribute
    return self.parse()

def _push(self, data):
    count = int(data)
    return {"type": "push", "data": [self.parse() for _ in range(count)]}
```

## Testing the Parser

```python
import io

def make_parser(raw: str):
    return RespParser(io.BytesIO(raw.encode()))

assert make_parser("+OK\r\n").parse() == "OK"
assert make_parser(":100\r\n").parse() == 100
assert make_parser("$3\r\nfoo\r\n").parse() == "foo"
assert make_parser("$-1\r\n").parse() is None
assert make_parser("*2\r\n+hello\r\n:42\r\n").parse() == ["hello", 42]

try:
    make_parser("-ERR something went wrong\r\n").parse()
except RedisError as e:
    assert "something went wrong" in str(e)
```

## Summary

RESP parsing centers on reading the type byte, branching to a handler, and recursing for arrays and maps. The main edge cases are null bulk strings (length -1), null arrays, nested arrays, error code prefixes, and RESP3's 10 additional types. A robust parser handles all of these and raises typed exceptions for error responses to enable cluster redirect handling.
