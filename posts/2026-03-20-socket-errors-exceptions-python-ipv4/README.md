# How to Handle Socket Errors and Exceptions in Python IPv4 Programming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Socket, IPv4, Error Handling, Exception, Networking

Description: Learn how to properly handle the most common socket errors and exceptions in Python IPv4 networking code for robust, production-ready applications.

## Common Socket Exceptions

Python socket errors are subclasses of `OSError`. Here are the most important ones:

| Exception | When It Occurs |
|-----------|---------------|
| `ConnectionRefusedError` | Server not listening on the port |
| `ConnectionResetError` | Remote host forcibly closed the connection |
| `BrokenPipeError` | Writing to a closed connection |
| `TimeoutError` (`socket.timeout` in older code) | Operation exceeded the timeout |
| `ConnectionAbortedError` | Connection attempt aborted by the peer |
| `OSError` (EADDRINUSE) | Port already in use when binding |

## Handling Connection Errors in a Client

```python
import socket

HOST = "192.168.1.100"
PORT = 9000

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    sock.settimeout(5.0)
    try:
        sock.connect((HOST, PORT))
        sock.sendall(b"Hello!")
        data = sock.recv(1024)
        print(data.decode())

    except ConnectionRefusedError:
        # Port is closed or a firewall is rejecting connections with RST
        print(f"Connection refused: {HOST}:{PORT} is not listening")

    except TimeoutError:
        # No response within timeout (often means packet is dropped by firewall)
        print(f"Timeout connecting to {HOST}:{PORT}")

    except OSError as e:
        # Catch-all for other OS-level socket errors
        print(f"Socket error: {e.errno} - {e.strerror}")
```

## Handling Errors in a Server

```python
import socket
import threading
import errno

def handle_client(conn: socket.socket, addr: tuple) -> None:
    with conn:
        conn.settimeout(30.0)
        while True:
            try:
                data = conn.recv(4096)
                if not data:
                    # Graceful close from client
                    print(f"[{addr}] Disconnected gracefully")
                    break

                conn.sendall(data)

            except ConnectionResetError:
                # Client closed without proper shutdown (e.g., crash)
                print(f"[{addr}] Connection reset by peer")
                break

            except BrokenPipeError:
                # We tried to write after the client closed the connection
                print(f"[{addr}] Broken pipe - client gone")
                break

            except TimeoutError:
                # Client was inactive too long
                print(f"[{addr}] Read timeout - closing")
                break

            except OSError as e:
                print(f"[{addr}] OS error: {e}")
                break


with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
    try:
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(("0.0.0.0", 9000))
    except OSError as e:
        if e.errno == errno.EADDRINUSE:
            print("Port 9000 is already in use!")
        raise

    srv.listen(50)
    while True:
        try:
            conn, addr = srv.accept()
            threading.Thread(target=handle_client, args=(conn, addr), daemon=True).start()
        except OSError as e:
            print(f"Accept error: {e}")
            break
```

## Checking errno for Specific Errors

```python
import socket
import errno

try:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("0.0.0.0", 9000))   # Will fail if port is busy
except OSError as e:
    if e.errno == errno.EADDRINUSE:
        print("Address already in use - try a different port or set SO_REUSEADDR for recently closed sockets")
    elif e.errno == errno.EACCES:
        print("Permission denied - binding privileged ports may require elevated privileges")
    else:
        raise
```

## Retry with Exponential Backoff

```python
import socket
import time

def connect_with_retry(host: str, port: int, max_attempts: int = 5) -> socket.socket:
    """Retry connection with exponential backoff."""
    for attempt in range(max_attempts):
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5.0)
            sock.connect((host, port))
            return sock
        except (ConnectionRefusedError, TimeoutError) as e:
            wait = 2 ** attempt  # 1, 2, 4, 8, 16 seconds
            print(f"Attempt {attempt + 1} failed: {e}. Retrying in {wait}s...")
            sock.close()
            time.sleep(wait)

    raise ConnectionError(f"Could not connect to {host}:{port} after {max_attempts} attempts")
```

## Conclusion

Robust Python socket code handles at minimum: `ConnectionRefusedError`, `ConnectionResetError`, `BrokenPipeError`, `TimeoutError`, and `OSError`. Use `errno` constants to distinguish specific OS errors when you need different handling per error code. Always implement retry logic with backoff for transient connection failures.
