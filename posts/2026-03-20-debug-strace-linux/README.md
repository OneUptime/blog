# How to Debug Socket Programming Issues with strace on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Strace, Socket, Debugging, IPv4, Networking, POSIX

Description: Learn how to use strace on Linux to trace socket system calls, diagnose connection failures, inspect bind/accept/recv sequences, and understand what a network program is actually doing at the...

## What strace Does

`strace` intercepts and logs every system call a process makes. For socket programming, it reveals the exact arguments and return values of `socket()`, `bind()`, `connect()`, `accept()`, `send()`, `recv()`, and `close()` - making it easy to spot misconfigurations without modifying source code.

## Basic Usage

```bash
# Trace all syscalls of a command

strace ./my_server

# Attach to a running process by PID
strace -p $(pgrep my_server)

# Save output to a file (strace writes to stderr by default)
strace -o trace.log ./my_server

# Follow child processes (important for forking servers)
strace -f ./my_server

# Timestamp each line
strace -t ./my_server       # HH:MM:SS
strace -tt ./my_server      # HH:MM:SS.microseconds
strace -r ./my_server       # relative time since last call
```

## Filter Only Socket-Related Syscalls

```bash
# Trace only socket-related system calls (reduces noise)
strace -e trace=%network ./my_server

# Commonly useful network syscalls
strace -e trace=socket,bind,listen,accept,accept4,connect,\
send,sendto,recv,recvfrom,setsockopt,getsockopt,close,shutdown \
./my_server
```

## Reading strace Output for Sockets

```text
# socket() - creates a socket, returns file descriptor
socket(AF_INET, SOCK_STREAM, IPPROTO_TCP) = 3

# setsockopt() - sets SO_REUSEADDR on fd 3
setsockopt(3, SOL_SOCKET, SO_REUSEADDR, [1], 4) = 0

# bind() - binds fd 3 to 0.0.0.0:9000
bind(3, {sa_family=AF_INET, sin_port=htons(9000),
          sin_addr=inet_addr("0.0.0.0")}, 16) = 0

# listen() - marks fd 3 as a passive socket
listen(3, 128) = 0

# accept4() - blocks; returns client fd 4 when a connection arrives
accept4(3, {sa_family=AF_INET, sin_port=htons(54321),
             sin_addr=inet_addr("127.0.0.1")}, [16], SOCK_NONBLOCK) = 4

# recv() - reads data from client fd 4
recv(4, "GET / HTTP/1.1\r\n", 4096, 0) = 16

# connect() failure - ECONNREFUSED
connect(3, {sa_family=AF_INET, sin_port=htons(9000),
             sin_addr=inet_addr("127.0.0.1")}, 16) = -1 ECONNREFUSED
```

## Diagnosing Common Issues

```bash
# Why does bind() fail with EADDRINUSE?
strace -e trace=socket,setsockopt,bind ./my_server 2>&1 | grep -E "bind|EADDRINUSE"
# → bind(3, ...) = -1 EADDRINUSE (Address already in use)
# Fix: set SO_REUSEADDR before bind(), or find and kill the existing listener:
ss -tlnp | grep 9000

# Why does connect() hang or timeout?
strace -e trace=connect,select,poll,epoll_wait -T ./my_client
# -T prints time spent in each syscall - a long connect() suggests a firewall drop

# Which file descriptor is leaking?
strace -e trace=socket,close -o fds.log ./my_server
grep -c "socket(" fds.log    # count opens
grep -c "close(" fds.log     # count closes - difference = leak

# Trace recv/send to see actual data bytes
strace -e trace=recv,send -s 256 ./my_server
# -s 256 increases the string length printed (default is 32)
```

## Tracing a TCP Connection Sequence

```bash
# Full TCP client lifecycle
strace -e trace=socket,connect,send,recv,close -s 512 curl http://example.com 2>&1 | head -30
```

Expected output pattern:
```text
socket(AF_INET, SOCK_STREAM, IPPROTO_TCP) = 3
connect(3, {sa_family=AF_INET, sin_port=htons(80), sin_addr=inet_addr("172.66.147.243")}, 16) = 0
send(3, "GET / HTTP/1.1\r\nHost: example.com\r\n...", 76, MSG_NOSIGNAL) = 76
recv(3, "HTTP/1.1 200 OK\r\n...", 16384, 0) = 1256
close(3) = 0
```

## Counting Syscalls (Performance Analysis)

```bash
# Summary of syscall counts and time - spot expensive calls
strace -c ./my_server
```

Example output:
```text
% time   seconds  calls   errors syscall
 58.32    0.023   10000        0 recv
 30.11    0.012    5000        0 send
  8.44    0.003    5000        0 accept4
  3.13    0.001       1        0 bind
```

## Conclusion

`strace -e trace=%network` filters output to socket-related system calls, reducing noise from unrelated I/O. The return value after `=` shows success (fd or 0) or failure (-1 followed by the errno name). Use `-T` to measure time spent in each call - a blocking `accept4` or `connect` with a large duration points to a timeout or connection issue. Use `-f` to follow forked child processes in multi-process servers. Combine `strace` with `ss -tlnp` (to see what is bound) and `tcpdump` (to see what actually goes on the wire) for complete socket debugging coverage.
