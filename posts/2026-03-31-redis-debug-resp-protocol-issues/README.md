# How to Debug RESP Protocol Issues in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RESP, Debugging, Protocol

Description: Debug RESP protocol issues in Redis using raw TCP inspection, tcpdump, redis-cli raw mode, and common error pattern identification.

---

When Redis clients misbehave, the problem is often at the RESP protocol layer. This guide covers tools and techniques to inspect raw RESP traffic and diagnose encoding or parsing bugs.

## Using redis-cli in Raw RESP Mode

`redis-cli` has a `--no-auth-warning` and `-3` (RESP3) flag, but the most useful mode for debugging is `-3` combined with `--verbose`:

```bash
# See raw RESP bytes with --show-pushes
redis-cli -3 --show-pushes yes

# Print exact bytes sent and received
redis-cli --raw GET mykey
```

Use `--quoted-input` to send exact byte sequences:

```bash
redis-cli --quoted-input SET "foo\x00bar" value
```

## Inspecting RESP Traffic with tcpdump

Capture Redis traffic on loopback:

```bash
sudo tcpdump -i lo -A -s 0 'tcp port 6379' 2>/dev/null | head -200
```

This shows the raw ASCII of each packet. A `SET foo bar` command looks like:

```text
*3
$3
SET
$3
foo
$3
bar
```

And the response:

```text
+OK
```

## Sending Raw RESP with netcat

To test what Redis returns for a manually crafted command:

```bash
printf "*2\r\n\$3\r\nGET\r\n\$5\r\nmykey\r\n" | nc localhost 6379
```

This bypasses any client library and confirms whether the server behavior is correct.

## Common RESP Bugs and How to Spot Them

**1. Missing CRLF:**

```text
# Wrong: uses \n only
*2\n$3\nGET\n$3\nfoo\n

# Correct: must use \r\n
*2\r\n$3\r\nGET\r\n$3\r\nfoo\r\n
```

Redis is strict - a missing `\r` causes the server to wait for more input and the client hangs.

**2. Wrong byte count in bulk string:**

```python
# Bug: using len() on a unicode string, not bytes
key = "naïve"
wrong = f"${len(key)}\r\n{key}\r\n"  # reports 5, actual UTF-8 is 6 bytes

# Fix: encode first, use byte length
key_bytes = key.encode("utf-8")
correct = f"${len(key_bytes)}\r\n".encode() + key_bytes + b"\r\n"
```

**3. Pipelining desync:**

If you pipeline N commands but only read N-1 responses, the leftover response poisons the next command's read. Debug by counting sent vs received:

```python
commands_sent = 0
responses_read = 0

def send(cmd):
    global commands_sent
    sock.sendall(encode(cmd))
    commands_sent += 1

def recv():
    global responses_read
    result = parse()
    responses_read += 1
    return result

# After a pipeline batch
assert commands_sent == responses_read, \
    f"Desync: sent {commands_sent}, read {responses_read}"
```

## Using MONITOR to See Incoming Commands

`MONITOR` streams every command received by Redis in real time:

```bash
redis-cli MONITOR
```

Output:

```text
1711900000.123456 [0 127.0.0.1:51234] "SET" "foo" "bar"
1711900000.124000 [0 127.0.0.1:51234] "GET" "foo"
```

This confirms whether your client is sending the right command arguments and in the right order.

## Checking for Inline vs Multibulk Commands

Redis accepts both inline format (for human use) and multibulk format (for clients). Inline commands can cause unexpected behavior if your client accidentally sends them:

```bash
# Inline (sent by typing in telnet - acceptable for simple commands)
SET foo bar

# Multibulk (what all clients should send)
*3\r\n$3\r\nSET\r\n$3\r\nfoo\r\n$3\r\nbar\r\n
```

Inline format does not support binary-safe keys or values, so a client sending inline commands will fail silently on keys with special characters.

## Summary

RESP debugging starts with `redis-cli --raw` for quick checks, tcpdump for network-level inspection, and netcat for crafting exact byte sequences. The most common bugs are wrong byte counts for multibyte characters, missing `\r\n` terminators, and pipeline response desync. `MONITOR` is invaluable for confirming that the right commands are reaching the server.
