# Validation Summary: How to Create a Port Scanner in Go Using IPv4 TCP Connections

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- IPv4
- TCP
- Port scanning
- Banner grabbing
- Goroutines
- Channels
- `sync.WaitGroup`

## Sources Consulted
- Go standard library `net` package documentation: https://pkg.go.dev/net
- Go standard library `bufio` package documentation: https://pkg.go.dev/bufio
- Go standard library `sync` package documentation: https://pkg.go.dev/sync
- Go standard library `sort` package documentation: https://pkg.go.dev/sort

## Issues Found
- The concurrent scanner acquired the semaphore inside each goroutine, which still launched one goroutine per port and only limited active connection attempts. I moved semaphore acquisition to the loop before `go` so the example actually bounds the launched concurrent scan work, and I updated the surrounding wording to match.
- The banner-grabbing example only kept data when `bufio.Reader.ReadString('\n')` returned `nil` error. Go's `bufio` documentation notes that `ReadString` can return data together with an error if the delimiter is not found. I changed the code to preserve any non-empty banner text returned before the error so partial banners are not discarded.
- The `/24` host-scanning example described the input as a subnet, but the code expects the first three IPv4 octets rather than CIDR notation. I clarified the comment and example host format so the snippet matches the input it actually requires.

## Review Notes
- The banner example is still intentionally simple. Many services, especially TLS-based protocols or servers that wait for a client request first, will not send a readable banner immediately after a TCP connect.
- A local compile/run pass was not possible in this environment because the `go` toolchain is not installed.
- The author GitHub profile link resolves correctly.
