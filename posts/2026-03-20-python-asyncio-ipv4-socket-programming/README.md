# How to Use Python asyncio for Asynchronous IPv4 Socket Programming

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Asyncio, IPv4, Socket, Async, Networking, Concurrency

Description: Learn how to use Python's asyncio library to build high-concurrency IPv4 TCP servers and clients without threads or blocking I/O.

## Why asyncio for Socket Programming?

`asyncio` provides cooperative multitasking using coroutines. Unlike threads, coroutines switch at explicit `await` points, making suspension points easier to reason about while avoiding the overhead of thread creation. A single asyncio event loop can handle thousands of concurrent TCP connections.

## Async TCP Echo Server

```python
import asyncio

HOST = "0.0.0.0"
PORT = 9004

async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    """Coroutine called for each new client connection."""
    addr = writer.get_extra_info("peername")
    print(f"Connected: {addr}")

    try:
        while True:
            # Await incoming data; yields control to event loop while waiting
            data = await reader.read(4096)
            if not data:
                break   # Client disconnected

            print(f"[{addr}] Received: {data.decode('utf-8', errors='replace')}")

            # Send the data back (echo)
            writer.write(data)
            # Wait for flow control if the write buffer is full
            await writer.drain()

    except ConnectionResetError:
        pass
    finally:
        print(f"Disconnected: {addr}")
        writer.close()
        await writer.wait_closed()


async def main():
    # asyncio.start_server creates the listening socket and calls handle_client
    # for each new connection
    server = await asyncio.start_server(
        handle_client,
        HOST,
        PORT,
        family=socket.AF_INET   # Force IPv4
    )
    addr = server.sockets[0].getsockname()
    print(f"Serving on {addr}")

    async with server:
        await server.serve_forever()


import socket
asyncio.run(main())
```

## Async TCP Client

```python
import asyncio

async def tcp_client(host: str, port: int, message: str) -> str:
    # Open a TCP connection; returns (reader, writer) streams
    reader, writer = await asyncio.open_connection(host, port)

    # Send message
    writer.write(message.encode("utf-8"))
    await writer.drain()

    # Receive response
    data = await reader.read(4096)
    response = data.decode("utf-8")

    # Gracefully close the connection
    writer.close()
    await writer.wait_closed()

    return response


async def main():
    reply = await tcp_client("127.0.0.1", 9004, "Hello async world!")
    print(f"Server replied: {reply}")

asyncio.run(main())
```

## Handling Multiple Concurrent Clients

asyncio handles concurrency natively - just run many client coroutines together:

```python
import asyncio

async def single_request(host: str, port: int, msg: str, client_id: int) -> None:
    reader, writer = await asyncio.open_connection(host, port)
    writer.write(msg.encode())
    await writer.drain()
    data = await reader.read(1024)
    print(f"Client {client_id} got: {data.decode()}")
    writer.close()
    await writer.wait_closed()

async def main():
    # Launch 100 concurrent connections
    tasks = [
        single_request("127.0.0.1", 9004, f"Hello from client {i}", i)
        for i in range(100)
    ]
    await asyncio.gather(*tasks)

asyncio.run(main())
```

## Setting Connection Timeouts

```python
import asyncio

async def client_with_timeout():
    try:
        # Raise TimeoutError if connection not established within 5 seconds
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection("127.0.0.1", 9004),
            timeout=5.0
        )
        writer.write(b"Hello!")
        await writer.drain()
        data = await asyncio.wait_for(reader.read(1024), timeout=5.0)
        print(data.decode())
        writer.close()
        await writer.wait_closed()
    except TimeoutError:
        print("Connection or response timed out")

asyncio.run(client_with_timeout())
```

## Conclusion

Python's `asyncio` makes it easy to build high-concurrency IPv4 TCP servers and clients with `asyncio.start_server` and `asyncio.open_connection`. By awaiting I/O operations, a single event loop thread can serve thousands of clients concurrently, far more efficiently than one thread per connection.
