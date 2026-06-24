# How to Build IPv6 Network Tools in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Network Tools, CLI, Ping, Traceroute

Description: Build practical IPv6 network tools in Go including ping6, traceroute6, and port scanner as command-line utilities.

## IPv6 Ping Tool

```go
package main

import (
    "fmt"
    "net"
    "os"
    "time"

    "golang.org/x/net/icmp"
    "golang.org/x/net/ipv6"
)

func ping6(host string, count int) error {
    // Resolve host to IPv6
    addrs, err := net.LookupIP(host)
    if err != nil {
        return fmt.Errorf("lookup failed: %w", err)
    }

    var targetIP net.IP
    for _, addr := range addrs {
        if addr.To4() == nil && addr.To16() != nil {
            targetIP = addr
            break
        }
    }
    if targetIP == nil {
        return fmt.Errorf("no IPv6 address for %s", host)
    }

    // Create a privileged raw ICMPv6 socket
    conn, err := icmp.ListenPacket("ip6:ipv6-icmp", "::")
    if err != nil {
        return fmt.Errorf("listen: %w", err)
    }
    defer conn.Close()

    payload := make([]byte, 56)
    fmt.Printf("PING6 %s (%s): %d data bytes\n", host, targetIP, len(payload))

    for i := 0; i < count; i++ {
        // Build ICMPv6 Echo Request
        msg := icmp.Message{
            Type: ipv6.ICMPTypeEchoRequest,
            Code: 0,
            Body: &icmp.Echo{
                ID:   os.Getpid() & 0xffff,
                Seq:  i,
                Data: payload,
            },
        }

        msgBytes, err := msg.Marshal(nil)
        if err != nil {
            continue
        }

        dest := &net.IPAddr{IP: targetIP}
        start := time.Now()
        _, err = conn.WriteTo(msgBytes, dest)
        if err != nil {
            fmt.Printf("Send error: %v\n", err)
            continue
        }

        // Wait for reply
        conn.SetReadDeadline(time.Now().Add(3 * time.Second))
        reply := make([]byte, 1500)
        n, peer, readErr := conn.ReadFrom(reply)
        elapsed := time.Since(start)

        if readErr != nil {
            fmt.Printf("Request timeout for icmp_seq=%d\n", i)
        } else {
            rm, parseErr := icmp.ParseMessage(58, reply[:n])
            if parseErr != nil {
                fmt.Printf("Parse error: %v\n", parseErr)
                continue
            }
            if rm.Type == ipv6.ICMPTypeEchoReply {
                fmt.Printf("%d bytes from %s: icmp_seq=%d time=%.3f ms\n",
                    n, peer, i, float64(elapsed.Nanoseconds())/1e6)
            }
        }

        time.Sleep(time.Second)
    }

    return nil
}

func main() {
    if len(os.Args) < 2 {
        fmt.Println("Usage: ping6tool <host>")
        os.Exit(1)
    }
    if err := ping6(os.Args[1], 4); err != nil {
        fmt.Println("Error:", err)
        os.Exit(1)
    }
}
```

## IPv6 Port Scanner

```go
package main

import (
    "context"
    "fmt"
    "net"
    "sync"
    "time"
)

type ScanResult struct {
    Host string
    Port int
    Open bool
}

func scanIPv6Port(ctx context.Context, host string, port int) ScanResult {
    target := net.JoinHostPort(host, fmt.Sprintf("%d", port))
    d := net.Dialer{Timeout: 2 * time.Second}

    conn, err := d.DialContext(ctx, "tcp6", target)
    if err == nil {
        conn.Close()
        return ScanResult{host, port, true}
    }
    return ScanResult{host, port, false}
}

func scanIPv6Host(host string, ports []int, workers int) []ScanResult {
    ctx := context.Background()
    portCh := make(chan int, len(ports))
    resultCh := make(chan ScanResult, len(ports))

    // Enqueue ports
    for _, p := range ports {
        portCh <- p
    }
    close(portCh)

    // Worker goroutines
    var wg sync.WaitGroup
    for i := 0; i < workers; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for port := range portCh {
                resultCh <- scanIPv6Port(ctx, host, port)
            }
        }()
    }

    go func() {
        wg.Wait()
        close(resultCh)
    }()

    var results []ScanResult
    for r := range resultCh {
        if r.Open {
            results = append(results, r)
        }
    }
    return results
}

func main() {
    host := "::1"
    commonPorts := []int{22, 80, 443, 8080, 8443, 3000, 5432, 6379}

    fmt.Printf("Scanning [%s]...\n", host)
    results := scanIPv6Host(host, commonPorts, 20)

    if len(results) == 0 {
        fmt.Println("No open ports found")
    }
    for _, r := range results {
        fmt.Printf("  [%s]:%d  OPEN\n", r.Host, r.Port)
    }
}
```

## IPv6 DNS Lookup Tool

```go
package main

import (
    "context"
    "fmt"
    "net"
    "os"
)

func lookupIPv6(hostname string) {
    resolver := &net.Resolver{PreferGo: true}
    ctx := context.Background()

    // AAAA records
    addrs, err := resolver.LookupIP(ctx, "ip6", hostname)
    if err != nil {
        fmt.Printf("Error: %v\n", err)
        return
    }

    fmt.Printf("IPv6 addresses for %s:\n", hostname)
    for _, addr := range addrs {
        fmt.Printf("  %s\n", addr)
    }

    // Reverse lookup for IPv6
    // Try PTR for the first IPv6 address
    for _, addr := range addrs {
        names, err := resolver.LookupAddr(ctx, addr.String())
        if err == nil {
            fmt.Printf("PTR records: %v\n", names)
        }
        break
    }
}

func main() {
    if len(os.Args) < 2 {
        fmt.Println("Usage: ip6dig <hostname>")
        os.Exit(1)
    }
    lookupIPv6(os.Args[1])
}
```

## Conclusion

Go is well-suited for building IPv6 network tools due to its built-in `net` package and concurrency primitives. The `golang.org/x/net/icmp` and `ipv6` packages enable raw ICMPv6 operations for ping-like tools. For port scanners, goroutine-based concurrent scanning with `net.Dialer` timeouts provides fast IPv6-only checks, while `net.Resolver` can be used for AAAA and reverse-DNS lookups.
