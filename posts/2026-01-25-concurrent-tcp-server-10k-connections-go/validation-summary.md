# Validation Summary: How to Build a Concurrent TCP Server for 10K+ Connections in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go `net` package
- Go goroutines and channels
- Go `sync.WaitGroup` and `sync.Pool`
- TCP servers
- Linux file descriptor limits
- Linux TCP/sysctl tuning
- tcpkali benchmarking

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `sync` package documentation: https://pkg.go.dev/sync
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux `getrlimit(2)` manual page for file descriptor resource limits: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- tcpkali official repository and command help: https://github.com/akumuli/tcpkali

## Issues Found
- The buffer pooling section said a new buffer was created for every read operation, but the shown code created one buffer per connection. Changed the wording to "every connection" and softened the GC claim.
- The `sync.Pool` examples stored `[]byte` values directly. Go's `sync.Pool` documentation recommends pointer values where practical to avoid interface-allocation overhead, so the buffer pool now stores pointers to fixed-size byte arrays.
- The Linux `tcp_tw_reuse` comment said it reuses `TIME_WAIT` sockets faster. Kernel documentation describes this as safe reuse for new connections, so the comment now clarifies that it applies to new outgoing connections.
- The connection close guidance said to always defer `conn.Close()` immediately after accepting. In the article's goroutine-per-connection pattern, the handler owns the connection, so the guidance now says each accepted connection needs one clear owner that closes it.
- The complete "production-ready" server used a single `conn.Write`, even though the post correctly warns that writes can be partial. Updated the final server to use `writeAll`, and added a defensive `io.ErrShortWrite` case.
- The standalone `writeAll` example did not handle a zero-byte write with no error. Added the same defensive `io.ErrShortWrite` handling.

## Review Notes
The local environment did not have the Go toolchain or tcpkali installed, so code examples and CLI flags were reviewed against official documentation and source references rather than compiled or executed locally. The remaining examples are technically sound for an article, though production deployments should also tune limits in the service manager or container runtime, not only in an interactive shell.
