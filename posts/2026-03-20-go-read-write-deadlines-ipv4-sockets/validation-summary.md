# Validation Summary: How to Set Read and Write Deadlines on IPv4 Sockets in Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- Go standard library `net` package
- TCP over IPv4 (`tcp4`)
- Socket read/write deadlines and timeouts

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `os` package documentation for `os.ErrDeadlineExceeded`: https://pkg.go.dev/os
- Go Wiki, Timeouts and Deadlines: https://go.dev/wiki/Timeouts

## Issues Found
- The introduction described deadlines as timeouts on individual operations. I changed that wording to match the Go docs: deadlines are absolute times that apply to future and pending I/O until changed or cleared.
- In the first client example, the read deadline was set before the request write, which meant the read timer started running before the client finished writing. I moved the read deadline to immediately before `Read` so the example matches the explanation.
- The examples used `net.Error.Timeout()` to identify deadline expiry. I changed those checks to `errors.Is(err, os.ErrDeadlineExceeded)` because the Go docs explicitly note that `Timeout()` can be true for errors other than deadline expiration.

## Review Notes
The environment did not have the Go toolchain installed, so I could not run a live compile check. The review was completed against the current official Go documentation, and the code paths reviewed are consistent with those APIs.
