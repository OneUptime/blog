# Validation Summary: How Redis IO Multiplexing Works (epoll, kqueue)

## Status
validated

## Post Type
Technical explainer / Guide

## Technologies Covered
- Redis (event loop internals, `ae` abstraction layer)
- Linux epoll API (`epoll_create`, `epoll_ctl`, `epoll_wait`)
- macOS/BSD kqueue API (`kqueue`, `kevent`)
- OS-level file descriptor tuning (`/etc/security/limits.conf`, `maxclients`)

## Sources Consulted
- Redis source code `ae_epoll.c` (unstable branch): https://github.com/redis/redis/blob/unstable/src/ae_epoll.c
- Redis source code `ae.c` (unstable branch): https://github.com/redis/redis/blob/unstable/src/ae.c
- Linux epoll(7) man page: https://man7.org/linux/man-pages/man7/epoll.7.html
- Redis INFO command documentation: https://redis.io/commands/info

## Issues Found

### 1. Incorrect epoll system call name
- **What was wrong:** The post listed `epoll_create1()` as the system call Redis uses to create the epoll instance. Redis actually uses `epoll_create(1024)` (the older variant where the size argument is a hint to the kernel, ignored since Linux 2.6.8). `epoll_create1()` is a different function that accepts flags (e.g., `EPOLL_CLOEXEC`).
- **What was changed:** Replaced `epoll_create1()` with `epoll_create()` in the epoll internals section.
- **Why:** The post explicitly states "Redis calls three system calls" — accuracy requires matching what Redis actually calls.

### 2. Incorrect event loop ordering
- **What was wrong:** The pseudocode showed `processTimeEvents()` being called first (step 1), before `epoll_wait()` (step 2). In the actual Redis `aeProcessEvents()` function, the order is: (1) poll for IO events via `epoll_wait`, (2) dispatch fired file events, (3) process time events. The poll timeout is derived from the nearest pending time event so timers aren't missed, but the actual timer processing happens last.
- **What was changed:** Reordered the pseudocode so `epoll_wait()` comes first, IO dispatch second, and `processTimeEvents()` last. Updated the timeout comment to clarify that the timeout is derived from the nearest time event.
- **Why:** For a post about Redis internals, the event loop ordering is a core detail that readers may rely on to understand Redis behavior.

## Review Notes
- The post mentions Redis achieves high concurrency "without multi-threading." Since Redis 6.0, IO threads can be enabled for read/write operations (`io-threads` config), though command processing remains single-threaded. The post's focus is on the event loop model, so this simplification is acceptable in context but could be noted in a future update.
- The backend selection list omits `evport` (Solaris). Redis's actual priority is: evport > epoll > kqueue > select. This is a minor omission since the post focuses on Linux and macOS, which are the dominant platforms.
- All CLI commands (`redis-cli INFO server`, `redis-cli --stat -i 1`, `redis-cli INFO clients`) are correct.
- The `maxclients` directive and `/etc/security/limits.conf` syntax are correct.
- The O(1) scaling claim for epoll vs select is a standard and accepted characterization.
