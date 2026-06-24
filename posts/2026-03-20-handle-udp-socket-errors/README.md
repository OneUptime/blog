# How to Handle UDP Socket Errors in Application Code

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, Socket, Error Handling, Python, Linux, Programming

Description: Handle UDP socket errors including ICMP port unreachable delivery, ENOBUFS, ECONNREFUSED, and timeout errors correctly in application code.

## Introduction

UDP error handling is counterintuitive because UDP is connectionless. However, the kernel does deliver some errors to UDP sockets - most notably, ICMP port unreachable messages are delivered back to the sender. Proper error handling means catching these asynchronous errors, handling transient local send failures such as `ENOBUFS`, implementing timeouts for request/response `recvfrom()`/`recv()` calls, and deciding when to retry versus give up.

## ICMP Errors Delivered to UDP Sockets

```python
#!/usr/bin/env python3
# UDP errors from ICMP messages

import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.settimeout(2.0)

# Send to a port that's not listening (can trigger ICMP port unreachable)

# With a connected UDP socket, this error is typically delivered on a later socket operation:
sock.connect(('127.0.0.1', 54321))  # UDP port with no listener

try:
    sock.send(b'hello')
    # ICMP port unreachable comes back asynchronously...
    response = sock.recv(1024)  # Often raises ECONNREFUSED on Linux
except ConnectionRefusedError as e:
    print(f"ICMP port unreachable received: {e}")
    # The remote port is not open (ICMP type 3, code 3)
except socket.timeout:
    print("No response and no ICMP error (filtered)")

# Note: On Linux, fatal UDP errors can also be reported on unconnected sockets.
# Delivery is less predictable there, so connect() is useful when talking to one peer.
```

## Request/Response Error Handling

```python
#!/usr/bin/env python3
import socket
import errno
import time

def udp_send_recv(server, port, data, retries=3, timeout=2.0):
    """Send UDP and receive response with common error handling."""
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(timeout)
    try:
        sock.connect((server, port))
    except OSError as e:
        if e.errno == errno.ENETUNREACH:
            print(f"Network unreachable: {e}")
            sock.close()
            return None, None
        elif e.errno == errno.EHOSTUNREACH:
            print(f"Host unreachable: {e}")
            sock.close()
            return None, None
        else:
            sock.close()
            raise

    for attempt in range(retries):
        try:
            sock.send(data)
        except ConnectionRefusedError:
            print(f"Connection refused: {server}:{port} has no listener")
            break
        except OSError as e:
            if e.errno == errno.ENOBUFS:
                # Transient local send failure (rare on Linux)
                print(f"Send queue full, waiting... (attempt {attempt+1})")
                time.sleep(0.01 * (2 ** attempt))  # Exponential backoff
                continue
            elif e.errno == errno.ENETUNREACH:
                print(f"Network unreachable: {e}")
                break
            elif e.errno == errno.EHOSTUNREACH:
                print(f"Host unreachable: {e}")
                break
            else:
                raise

        try:
            response = sock.recv(65535)
            sock.close()
            return response, (server, port)

        except socket.timeout:
            print(f"Timeout on attempt {attempt+1}/{retries}")
            continue

        except ConnectionRefusedError:
            # ICMP port unreachable (port not open on remote)
            print(f"Connection refused: {server}:{port} has no listener")
            break

    sock.close()
    return None, None

# Usage:
result, addr = udp_send_recv('127.0.0.1', 54321, b'query data')
if result:
    print(f"Response from {addr}: {result}")
else:
    print("No response received")
```

## Handling ENOBUFS and EAGAIN on Send

```python
import errno
import time

def send_with_backpressure(sock, data, addr, max_retries=10):
    """Send UDP with retry on transient send backpressure."""
    for i in range(max_retries):
        try:
            sock.sendto(data, addr)
            return True
        except BlockingIOError:
            # Non-blocking socket: send would block (EAGAIN/EWOULDBLOCK)
            time.sleep(0.001 * (i + 1))
        except OSError as e:
            if e.errno == errno.ENOBUFS:
                # Transient local send failure (rare on Linux)
                time.sleep(0.001 * (i + 1))
            else:
                raise
    return False  # Failed after all retries
```

## ICMP Error Receipt on Linux

```python
import socket

# Linux can report fatal UDP errors on normal socket operations too.
# IP_RECVERR is useful when you want reliable access to the per-socket error queue.
IP_RECVERR = getattr(socket, 'IP_RECVERR', 11)  # Linux IPv4 socket option
MSG_ERRQUEUE = getattr(socket, 'MSG_ERRQUEUE', 8192)  # Linux recvmsg() flag

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setblocking(False)
sock.setsockopt(socket.IPPROTO_IP, IP_RECVERR, 1)

# Send a datagram so any ICMP error has a packet to refer to.
sock.sendto(b'hello', ('127.0.0.1', 54321))

try:
    data, ancdata, flags, addr = sock.recvmsg(1024, 256, MSG_ERRQUEUE)
except BlockingIOError:
    pass  # No error in queue
```

## Conclusion

UDP error handling requires attention to three error classes: asynchronous ICMP errors (`ECONNREFUSED` for port unreachable), transient local send backpressure (`EAGAIN`/`EWOULDBLOCK` on non-blocking sockets, and sometimes `ENOBUFS`), and receive timeouts in request/response code. Use a connected UDP socket when talking to one peer, because it simplifies I/O and makes error handling easier. Implement exponential backoff retry only for transient local send failures. Set `sock.settimeout()` when a request/response path needs a bounded wait; servers that intentionally block on `recvfrom()` are fine. For unconnected sockets that need reliable Linux error-queue delivery, use `IP_RECVERR` with `MSG_ERRQUEUE`.
