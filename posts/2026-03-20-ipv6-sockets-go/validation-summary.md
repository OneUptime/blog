# Validation Summary: How to Create IPv6 Sockets in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go standard library `net` package
- IPv6
- TCP sockets
- UDP sockets
- Dual-stack networking
- Link-local IPv6 addressing

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net` package source, `ipsock_posix.go` socket-family selection comments: https://go.dev/src/net/ipsock_posix.go
- Go `net` package source, `listen_test.go` platform dual-stack notes: https://go.dev/src/net/listen_test.go
- RFC 4007, IPv6 Scoped Address Architecture: https://www.rfc-editor.org/rfc/rfc4007

## Issues Found
- The introduction and conclusion stated that `"tcp"` is simply for dual-stack listeners. I changed that wording to reflect Go's documented behavior: wildcard `"tcp"` listeners may be dual-stack on platforms that support IPv4-mapped IPv6 sockets, but this is OS-dependent.
- The dual-stack server comments said this behavior was specific to Linux and suggested macOS/BSD generally needed separate listeners. I corrected that to platform-dependent wording consistent with Go's own source and tests, which document differing defaults across operating systems.
- Two `fmt.Printf` calls used `% s` instead of `%s`, which would produce incorrect output. I fixed both format strings.
- The dual-stack example identified IPv6 clients by parsing `RemoteAddr().String()`. I changed it to inspect `*net.TCPAddr` directly so IPv6 detection is based on the parsed address type rather than string parsing edge cases.

## Review Notes
- The Go toolchain was not available in the workspace, so validation was done against official documentation and source rather than local compilation.
