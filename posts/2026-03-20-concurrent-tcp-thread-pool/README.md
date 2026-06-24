# How to Build a Concurrent TCP Server for IPv4 Using Thread Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, IPv4, Thread Pool, Python, Java, Go, Networking

Description: Learn how to build a concurrent TCP server for IPv4 using thread pools in Python, Java, and Go to handle many simultaneous connections efficiently without creating a thread per connection.

## Python: ThreadPoolExecutor

```python
import socket
import concurrent.futures

MAX_WORKERS = 20

def handle(conn: socket.socket, addr: tuple) -> None:
    with conn:
        print(f"[+] {addr}")
        while True:
            data = conn.recv(4096)
            if not data:
                break
            conn.sendall(data)
        print(f"[-] {addr}")

def serve(host: str = "0.0.0.0", port: int = 9000) -> None:
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((host, port))
    server.listen(50)
    print(f"Thread pool server on {host}:{port} ({MAX_WORKERS} workers)")

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        try:
            while True:
                conn, addr = server.accept()
                pool.submit(handle, conn, addr)
        except KeyboardInterrupt:
            print("Shutting down...")
    server.close()

serve()
```

## Python: Bounded Queue with Backpressure

```python
import socket
import threading
import queue

WORKERS    = 10
QUEUE_SIZE = 50   # reject connections when queue is full

task_queue: queue.Queue = queue.Queue(maxsize=QUEUE_SIZE)

def handle(conn: socket.socket, addr: tuple) -> None:
    with conn:
        print(f"[+] {addr}")
        while True:
            data = conn.recv(4096)
            if not data:
                break
            conn.sendall(data)
        print(f"[-] {addr}")

def worker() -> None:
    while True:
        conn, addr = task_queue.get()
        try:
            handle(conn, addr)
        finally:
            task_queue.task_done()

# Start worker threads

for _ in range(WORKERS):
    threading.Thread(target=worker, daemon=True).start()

server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind(("0.0.0.0", 9000))
server.listen(50)

while True:
    conn, addr = server.accept()
    try:
        task_queue.put_nowait((conn, addr))
    except queue.Full:
        conn.close()   # reject: server at capacity
        print(f"Rejected {addr} - queue full")
```

## Java: Fixed Thread Pool

```java
import java.io.*;
import java.net.*;
import java.util.concurrent.*;

public class PoolServer {
    static void handle(Socket s) {
        try (s) {
            InputStream  in  = s.getInputStream();
            OutputStream out = s.getOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
        } catch (IOException e) { System.err.println(e.getMessage()); }
    }

    public static void main(String[] args) throws IOException {
        ExecutorService pool   = Executors.newFixedThreadPool(20);
        ServerSocket    server = new ServerSocket(9000);
        System.out.println("Pool server on :9000");

        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            pool.shutdown();
            try { server.close(); } catch (IOException ignored) {}
        }));

        while (!server.isClosed()) {
            try {
                Socket client = server.accept();
                pool.submit(() -> handle(client));
            } catch (IOException e) {
                if (!server.isClosed()) System.err.println(e.getMessage());
            }
        }
    }
}
```

## Go: Worker Pool with Buffered Channel

```go
package main

import (
    "io"
    "log"
    "net"
)

const WORKERS = 20

func worker(jobs <-chan net.Conn) {
    for conn := range jobs {
        log.Printf("[+] %s", conn.RemoteAddr())
        io.Copy(conn, conn)
        conn.Close()
        log.Printf("[-] %s", conn.RemoteAddr())
    }
}

func main() {
    ln, err := net.Listen("tcp4", "0.0.0.0:9000")
    if err != nil {
        log.Fatal(err)
    }
    defer ln.Close()

    jobs := make(chan net.Conn, 100)  // buffered queue

    for i := 0; i < WORKERS; i++ {
        go worker(jobs)
    }

    log.Printf("Worker pool server on :9000 (%d workers)", WORKERS)
    for {
        conn, err := ln.Accept()
        if err != nil { break }
        select {
        case jobs <- conn:
        default:
            conn.Close()   // reject: pool saturated
        }
    }
}
```

## Conclusion

A thread pool bounds the number of concurrent workers and helps prevent thread exhaustion under load, but queued work is only bounded if you also use a bounded queue. Use `ThreadPoolExecutor` (Python), `Executors.newFixedThreadPool` (Java), or a buffered channel with worker goroutines (Go). When the pool is saturated, either reject new connections immediately (for raw TCP, usually by closing the connection; an HTTP server could return a 503) or queue them with a bounded queue to provide backpressure. Choose the pool size based on the expected connection duration and the target concurrency - CPU-bound tasks need far fewer workers than I/O-bound tasks.
