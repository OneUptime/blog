# How to Create a TCP Server Using Python Sockets with IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, TCP, Socket, IPv4, Networking, Server

Description: Learn how to build a basic TCP server in Python using the socket module with IPv4 addressing to accept and handle client connections.

## TCP Server Fundamentals

A TCP server binds to an address and port, listens for incoming connections, and processes client requests sequentially or concurrently. Python's built-in `socket` module provides all the primitives needed.

## Basic Echo TCP Server

```python
import socket

# Server configuration

HOST = "0.0.0.0"   # Listen on all available IPv4 interfaces
PORT = 9000        # Port to listen on

# Create a TCP socket using IPv4 (AF_INET) and TCP (SOCK_STREAM)
with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
    # Allow immediate reuse of the port after server restart
    server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    # Bind the socket to the host and port
    server_socket.bind((HOST, PORT))

    # Begin listening; backlog=5 means up to 5 queued connections
    server_socket.listen(5)
    print(f"Server listening on {HOST}:{PORT}")

    while True:
        # Block until a client connects; returns (socket, address) tuple
        conn, addr = server_socket.accept()
        print(f"Connected by {addr}")

        with conn:
            while True:
                # Receive up to 1024 bytes of data
                data = conn.recv(1024)
                if not data:
                    # Empty data means client closed the connection
                    break
                print(f"Received: {data.decode('utf-8')}")
                # Echo the data back to the client
                conn.sendall(data)
```

## Running and Testing the Server

Start the server:

```bash
python3 tcp_server.py
```

Test it with `netcat` or `telnet` in another terminal:

```bash
# Connect and send a message
echo "Hello, server!" | nc -N 127.0.0.1 9000
```

## Handling Connection Errors Gracefully

```python
import socket

HOST = "0.0.0.0"
PORT = 9000

with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOST, PORT))
    srv.listen(5)
    print(f"Listening on {HOST}:{PORT}")

    while True:
        try:
            conn, addr = srv.accept()
        except KeyboardInterrupt:
            print("Server shutting down.")
            break

        with conn:
            try:
                while True:
                    data = conn.recv(4096)
                    if not data:
                        break
                    conn.sendall(data)
            except (ConnectionResetError, BrokenPipeError) as e:
                print(f"Client {addr} disconnected abruptly: {e}")
```

## Key Socket Options Explained

| Option | Purpose |
|--------|---------|
| `AF_INET` | Use IPv4 addressing |
| `SOCK_STREAM` | TCP (reliable, ordered byte stream) |
| `SO_REUSEADDR` | Allow port reuse after server restart |
| `listen(n)` | Set connection backlog queue size |
| `recv(n)` | Receive up to n bytes; returns empty bytes on close |

## Checking Active Connections

```bash
# Verify the server is listening on the correct port
ss -tlnp | grep 9000
```

## Conclusion

Building a TCP server in Python requires just a few socket calls: `socket()`, `bind()`, `listen()`, and `accept()`. The echo server above is the foundation-add threading, asyncio, or process pools to handle multiple clients concurrently, covered in subsequent posts.
