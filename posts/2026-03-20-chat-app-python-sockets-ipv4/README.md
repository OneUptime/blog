# How to Implement a Chat Application with Python Sockets over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, TCP, Chat, Socket, IPv4, Threading, Networking

Description: Learn how to build a multi-client chat application in Python using IPv4 TCP sockets with threading for real-time message broadcasting.

## Architecture

The chat server maintains a list of connected clients and broadcasts each received line to all other clients. Because TCP is a byte stream, the client and server use newline-delimited messages so each chat message can be parsed reliably. Each client runs two threads: one for receiving messages and one for sending user input.

## Chat Server

```python
import socket
import threading

HOST = "0.0.0.0"
PORT = 9006

# Shared state protected by a lock

clients: dict[socket.socket, str] = {}   # socket -> username
lock = threading.Lock()


def broadcast(message: bytes, sender: socket.socket = None) -> None:
    """Send a message to all connected clients except the sender."""
    with lock:
        for client_sock in list(clients.keys()):
            if client_sock is not sender:
                try:
                    client_sock.sendall(message)
                except OSError:
                    pass


def handle_client(conn: socket.socket, addr: tuple) -> None:
    """Handle a single client: register, relay messages, cleanup on disconnect."""
    username = "anonymous"

    try:
        with conn.makefile("r", encoding="utf-8", errors="replace", newline="\n") as reader:
            # First line from the client is their username
            username = reader.readline().strip() or "anonymous"

            with lock:
                clients[conn] = username

            broadcast(f"[Server] {username} has joined the chat!\n".encode(), sender=conn)
            print(f"[+] {username} connected from {addr}")

            while True:
                line = reader.readline()
                if not line:
                    break   # Client disconnected

                msg = f"[{username}] {line}"
                print(msg.strip())
                broadcast(msg.encode("utf-8"), sender=conn)

    except OSError:
        pass
    finally:
        with lock:
            clients.pop(conn, None)
        conn.close()
        broadcast(f"[Server] {username} has left the chat.\n".encode())
        print(f"[-] {username} disconnected")


def run_server():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as srv:
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind((HOST, PORT))
        srv.listen(50)
        print(f"Chat server on {HOST}:{PORT}")

        while True:
            try:
                conn, addr = srv.accept()
                t = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
                t.start()
            except KeyboardInterrupt:
                print("Server stopped")
                break


if __name__ == "__main__":
    run_server()
```

## Chat Client

```python
import socket
import threading

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 9006


def receive_messages(sock: socket.socket, stop_event: threading.Event) -> None:
    """Background thread: print newline-delimited messages from the server."""
    try:
        with sock.makefile("r", encoding="utf-8", errors="replace", newline="\n") as reader:
            while not stop_event.is_set():
                line = reader.readline()
                if not line:
                    print("\n[Disconnected from server]")
                    stop_event.set()
                    break
                print(line, end="")
    except OSError:
        stop_event.set()


def send_messages(sock: socket.socket, stop_event: threading.Event) -> None:
    """Background thread: read user input and send it to the server."""
    try:
        while not stop_event.is_set():
            msg = input()
            if msg.lower() == "/quit":
                stop_event.set()
                break
            sock.sendall(f"{msg}\n".encode("utf-8"))
    except (EOFError, KeyboardInterrupt, OSError):
        stop_event.set()


def run_client():
    username = input("Enter your username: ").strip() or "anonymous"

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as client:
        client.connect((SERVER_HOST, SERVER_PORT))

        # Send username as the first newline-delimited message
        client.sendall(f"{username}\n".encode("utf-8"))

        stop_event = threading.Event()

        recv_thread = threading.Thread(target=receive_messages, args=(client, stop_event), daemon=True)
        send_thread = threading.Thread(target=send_messages, args=(client, stop_event), daemon=True)
        recv_thread.start()
        send_thread.start()

        print(f"Connected as '{username}'. Type messages and press Enter.")

        try:
            while not stop_event.is_set():
                recv_thread.join(timeout=0.1)
                send_thread.join(timeout=0.1)
                if not recv_thread.is_alive() or not send_thread.is_alive():
                    stop_event.set()
        except KeyboardInterrupt:
            stop_event.set()

    print("Goodbye!")


if __name__ == "__main__":
    run_client()
```

## Running the Chat

```bash
# Terminal 1: Start server
python3 chat_server.py

# Terminal 2: First client
python3 chat_client.py

# Terminal 3: Second client
python3 chat_client.py
```

## Conclusion

A multi-client chat server requires a shared client registry, thread-safe broadcasting with a lock, and a simple framing rule because TCP is a byte stream. The client uses separate send and receive threads so input and output can run simultaneously. This pattern is the foundation for any real-time messaging system over TCP.
