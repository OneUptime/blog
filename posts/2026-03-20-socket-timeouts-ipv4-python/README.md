# How to Set Socket Timeouts for IPv4 Connections in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Socket, IPv4, Timeout, Networking, Error Handling

Description: Learn how to configure connection and read timeouts for Python IPv4 sockets to prevent applications from hanging indefinitely on slow or unreachable servers.

## Why Timeouts Matter

Without timeouts, a `connect()` call can block for a long OS-defined period, and a `recv()` call can block indefinitely if the server stops responding. Always set timeouts in production socket code.

## Setting a Timeout with settimeout()

```python
import socket

HOST = "192.168.1.100"
PORT = 9000

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# Set 5-second timeout for all socket operations (connect, send, recv)

sock.settimeout(5.0)

try:
    sock.connect((HOST, PORT))
    sock.sendall(b"Hello!")
    response = sock.recv(1024)
    print(response.decode())

except TimeoutError:
    print("Operation timed out")

except ConnectionRefusedError:
    print("Connection refused")

finally:
    sock.close()
```

`settimeout(n)` applies the same timeout to `connect()`, `send()`, and `recv()`.

## Separate Connect and Read Timeouts

To set different timeouts for connection vs. data reading:

```python
import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

# 3-second timeout just for the connection attempt
sock.settimeout(3.0)
try:
    sock.connect(("192.168.1.100", 9000))
except TimeoutError:
    print("Connection timed out after 3 seconds")
    sock.close()
    exit()

# Once connected, switch to a longer read timeout
sock.settimeout(30.0)

sock.sendall(b"heavy request")
try:
    response = sock.recv(65536)
    print(f"Got {len(response)} bytes")
except TimeoutError:
    print("Read timed out after 30 seconds")
finally:
    sock.close()
```

## Using connect_ex() for Non-Blocking Connect with Timeout

```python
import socket
import select
import errno
import os

def connect_with_timeout(host: str, port: int, timeout: float) -> socket.socket:
    """Non-blocking connect with custom timeout."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.setblocking(False)

    result = sock.connect_ex((host, port))
    pending_errors = {
        errno.EINPROGRESS,
        errno.EWOULDBLOCK,
        errno.EALREADY,
    }

    # EINPROGRESS/EWOULDBLOCK are expected for non-blocking connect
    if result != 0 and result not in pending_errors:
        sock.close()
        raise OSError(result, os.strerror(result))

    # Wait until the socket becomes writable (connection completed or failed)
    _, writable, _ = select.select([], [sock], [], timeout)
    if not writable:
        sock.close()
        raise TimeoutError(f"Connection to {host}:{port} timed out")

    # Check for connection errors
    err = sock.getsockopt(socket.SOL_SOCKET, socket.SO_ERROR)
    if err:
        sock.close()
        raise OSError(err, os.strerror(err))

    # Switch back to blocking for normal I/O
    sock.setblocking(True)
    return sock


try:
    with connect_with_timeout("192.168.1.100", 9000, timeout=3.0) as s:
        s.settimeout(30.0)
        s.sendall(b"Hello!")
        print(s.recv(1024).decode())
except OSError as e:
    print(e)
```

## Default Socket Timeout

You can set a global default timeout for all new sockets in the process:

```python
import socket

# All new sockets will have a 10-second timeout by default
socket.setdefaulttimeout(10.0)

# This socket inherits the 10-second timeout
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
```

## Timeout Summary

| Method | Effect |
|--------|--------|
| `settimeout(n)` | n > 0 sets timeout; 0 = non-blocking; None = blocking |
| `setblocking(False)` | Equivalent to `settimeout(0)` |
| `socket.setdefaulttimeout(n)` | Global default for new sockets |

## Conclusion

Always set socket timeouts when connecting to remote servers. Use `settimeout()` for a simple uniform timeout, or switch timeouts between connect and read phases for finer control. For connect-only timeouts in non-blocking mode, `connect_ex()` with `select()` gives maximum flexibility.
