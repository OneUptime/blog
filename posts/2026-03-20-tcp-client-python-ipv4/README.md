# How to Build a TCP Client in Python That Connects over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, TCP, Socket, IPv4, Networking, Client

Description: Learn how to build a TCP client in Python that connects to a server over IPv4, sends data, and receives responses using the socket module.

## TCP Client Basics

A TCP client creates a socket, connects to a server's IPv4 address and port, exchanges data, and closes the connection. Python's `socket` module makes this straightforward.

## Basic TCP Client

```python
import socket

# Server to connect to

SERVER_HOST = "127.0.0.1"   # Server IPv4 address
SERVER_PORT = 9000          # Server port

# Create an IPv4 TCP socket
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
    # Connect to the server; blocks until connection is established
    client.connect((SERVER_HOST, SERVER_PORT))
    print(f"Connected to {SERVER_HOST}:{SERVER_PORT}")

    # Send a message (must be bytes, not str)
    message = "Hello, server!"
    client.sendall(message.encode("utf-8"))

    # Receive response (up to 4096 bytes)
    response = client.recv(4096)
    print(f"Server response: {response.decode('utf-8')}")
# Socket is automatically closed when exiting the 'with' block
```

## Sending and Receiving Multiple Messages

This simple pattern assumes the server sends one complete, short response for each request; TCP itself does not preserve message boundaries.

```python
import socket

def connect_and_chat(host: str, port: int, messages: list[str]) -> list[str]:
    """Send multiple messages and collect responses."""
    responses = []
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.connect((host, port))

        for msg in messages:
            sock.sendall(msg.encode("utf-8"))
            data = sock.recv(4096)
            responses.append(data.decode("utf-8"))

    return responses

replies = connect_and_chat("127.0.0.1", 9000, ["ping", "hello", "bye"])
for reply in replies:
    print(reply)
```

## Adding Connection Timeout

```python
import socket

SERVER_HOST = "192.168.1.100"
SERVER_PORT = 9000

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
    # Set a 5-second timeout for the connection attempt
    sock.settimeout(5.0)

    try:
        sock.connect((SERVER_HOST, SERVER_PORT))
        # Once connected, switch to blocking mode for data transfer
        sock.settimeout(None)

        sock.sendall(b"Hello!")
        response = sock.recv(1024)
        print(response.decode())

    except socket.timeout:
        print(f"Connection to {SERVER_HOST}:{SERVER_PORT} timed out")
    except ConnectionRefusedError:
        print(f"Server refused connection on port {SERVER_PORT}")
```

## Handling Partial Sends

`sendall()` handles partial sends internally. However, for large payloads or custom protocols, you may need `send()` with a loop:

```python
import socket

def send_all(sock: socket.socket, data: bytes) -> None:
    """Ensure all bytes are sent, handling partial writes."""
    total_sent = 0
    while total_sent < len(data):
        sent = sock.send(data[total_sent:])
        if sent == 0:
            raise RuntimeError("Socket connection broken")
        total_sent += sent
```

## Receiving a Complete Response

When the response length is variable, read until the server closes the connection or you detect a message boundary:

```python
import socket

def receive_all(sock: socket.socket, buffer_size: int = 4096) -> bytes:
    """Receive all data until the server closes the connection."""
    data = b""
    while True:
        chunk = sock.recv(buffer_size)
        if not chunk:
            break  # Server closed connection
        data += chunk
    return data
```

## Conclusion

A Python TCP client needs just three calls: `socket()`, `connect()`, and `send()`/`recv()`. Always set a connection timeout to prevent hanging on unreachable servers, and use `sendall()` to ensure complete message delivery. The patterns above are the building blocks for any TCP-based client application.
