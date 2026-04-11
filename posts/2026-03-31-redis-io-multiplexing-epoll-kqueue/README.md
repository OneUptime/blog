# How Redis IO Multiplexing Works (epoll, kqueue)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Internal, Performance, Linux, Networking

Description: Understand how Redis uses epoll on Linux and kqueue on macOS to handle thousands of concurrent connections with a single thread efficiently.

---

Redis handles tens of thousands of simultaneous client connections using a technique called IO multiplexing. Rather than spawning a thread per connection, Redis monitors all sockets in a single event loop using the operating system's native multiplexing API.

## The Problem IO Multiplexing Solves

Without multiplexing, a server must either block on one connection at a time (sequential) or create a thread per connection (costly at scale). IO multiplexing lets a single thread watch many file descriptors and act only when one becomes ready.

## How Redis Selects the Backend

Redis wraps the OS-specific APIs in an abstraction layer called `ae` (Async Events). At compile time, it picks the best available backend:

```text
Linux  --> epoll
macOS  --> kqueue
Others --> select (fallback)
```

You can verify which backend is active:

```bash
redis-cli INFO server | grep multiplexing_api
# multiplexing_api:epoll
```

## epoll Internals (Linux)

epoll uses a kernel-side data structure to track interest in file descriptors. Redis calls three system calls:

```text
epoll_create()  - create the epoll instance once at startup
epoll_ctl()     - add/modify/remove file descriptors
epoll_wait()    - block until one or more FDs are ready
```

The key advantage over `select` is O(1) scaling: `epoll_wait` returns only the descriptors that fired events, not the entire watched set.

## kqueue Internals (macOS/BSD)

kqueue works similarly but uses a unified event queue for file, socket, process, and timer events:

```text
kqueue()       - create queue
kevent()       - register events and retrieve fired events in one call
```

## The Redis Event Loop

Redis runs a tight loop:

```c
// Simplified ae.c event loop
while (server.running) {
    // 1. Wait for socket events (timeout derived from nearest time event)
    numEvents = epoll_wait(epfd, events, MAX_EVENTS, timeout_ms);

    // 2. Dispatch each ready socket to its handler
    for (int i = 0; i < numEvents; i++) {
        if (events[i].events & EPOLLIN)
            readHandler(events[i].data.fd);
        if (events[i].events & EPOLLOUT)
            writeHandler(events[i].data.fd);
    }

    // 3. Process time events (expiry, cron jobs)
    processTimeEvents();
}
```

## Observing the Behavior

Watch connected clients and IO events in real time:

```bash
redis-cli INFO clients
# connected_clients:5432
# blocked_clients:0
```

Use `redis-cli --stat` to see commands processed per second while increasing client count:

```bash
redis-cli --stat -i 1
```

## Practical Tuning

Increase the system file descriptor limit before running Redis under high load:

```bash
# /etc/security/limits.conf
redis soft nofile 65536
redis hard nofile 65536
```

Set the same limit in Redis config:

```text
# redis.conf
maxclients 50000
```

## Summary

Redis achieves high concurrency without multi-threading by using epoll on Linux and kqueue on macOS to watch all client sockets in a single event loop. The kernel notifies Redis only when a socket has data ready, eliminating wasted CPU cycles from polling. Understanding this model explains why Redis performs so well with a single main thread and why increasing `maxclients` requires OS-level file descriptor tuning.
