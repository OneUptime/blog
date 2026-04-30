# How to Create a Port Scanner in Go Using IPv4 TCP Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Port Scanner, IPv4, TCP, Networking, Security, Concurrency

Description: Build a fast concurrent IPv4 TCP port scanner in Go using goroutines and channels to scan a host's open ports efficiently.

## Introduction

A port scanner probes TCP ports on a target host to determine which services are listening. Building one in Go demonstrates practical use of goroutines, channels, connection timeouts, and concurrent network programming. Use this only for authorized security testing.

## Simple Sequential Port Scanner

```go
package main

import (
    "fmt"
    "net"
    "time"
)

// scanPort returns true if the TCP port is open on the given host
func scanPort(host string, port int, timeout time.Duration) bool {
    address := fmt.Sprintf("%s:%d", host, port)
    conn, err := net.DialTimeout("tcp4", address, timeout)
    if err != nil {
        return false
    }
    conn.Close()
    return true
}

func main() {
    host := "192.168.1.1"
    timeout := 1 * time.Second

    for port := 1; port <= 1024; port++ {
        if scanPort(host, port, timeout) {
            fmt.Printf("Port %d is OPEN\n", port)
        }
    }
}
```

## Concurrent Port Scanner with Goroutines

The sequential scanner is too slow for large port ranges. Use goroutines with a semaphore (buffered channel) to limit concurrency:

```go
package main

import (
    "fmt"
    "net"
    "sort"
    "sync"
    "time"
)

func scanPortConcurrent(host string, port int, timeout time.Duration,
    results chan<- int, wg *sync.WaitGroup, sem chan struct{}) {
    
    defer wg.Done()
    
    defer func() { <-sem }()
    
    address := fmt.Sprintf("%s:%d", host, port)
    conn, err := net.DialTimeout("tcp4", address, timeout)
    if err != nil {
        return
    }
    conn.Close()
    results <- port
}

func scanHost(host string, startPort, endPort, maxConcurrent int, timeout time.Duration) []int {
    results := make(chan int, endPort-startPort+1)
    sem := make(chan struct{}, maxConcurrent)   // Limit concurrent connection attempts
    var wg sync.WaitGroup

    for port := startPort; port <= endPort; port++ {
        sem <- struct{}{} // Acquire semaphore slot before launching the goroutine
        wg.Add(1)
        go scanPortConcurrent(host, port, timeout, results, &wg, sem)
    }

    // Wait for all goroutines to finish, then close results channel
    go func() {
        wg.Wait()
        close(results)
    }()

    var openPorts []int
    for port := range results {
        openPorts = append(openPorts, port)
    }
    sort.Ints(openPorts)
    return openPorts
}

func main() {
    host := "192.168.1.1"
    
    fmt.Printf("Scanning %s ports 1-1024...\n", host)
    start := time.Now()
    
    openPorts := scanHost(host, 1, 1024, 500, 500*time.Millisecond)
    
    elapsed := time.Since(start)
    fmt.Printf("Scan completed in %s\n", elapsed)
    fmt.Printf("Open ports on %s:\n", host)
    for _, port := range openPorts {
        fmt.Printf("  %d/tcp\n", port)
    }
}
```

## Service Banner Grabbing

Extend the scanner to try grabbing service banners:

```go
package main

import (
    "bufio"
    "fmt"
    "net"
    "strings"
    "time"
)

type ScanResult struct {
    Port   int
    Open   bool
    Banner string
}

func scanWithBanner(host string, port int, timeout time.Duration) ScanResult {
    address := fmt.Sprintf("%s:%d", host, port)
    conn, err := net.DialTimeout("tcp4", address, timeout)
    if err != nil {
        return ScanResult{Port: port, Open: false}
    }
    defer conn.Close()

    result := ScanResult{Port: port, Open: true}

    // Set a short read deadline for banner grabbing
    conn.SetReadDeadline(time.Now().Add(2 * time.Second))

    // Try to read a banner (some services send data on connect)
    reader := bufio.NewReader(conn)
    banner, _ := reader.ReadString('\n')
    if banner != "" {
        result.Banner = strings.TrimSpace(banner)
    }

    return result
}

func main() {
    host := "192.168.1.100"
    ports := []int{21, 22, 23, 25, 53, 80, 443, 8080, 8443}

    fmt.Printf("Banner scan of %s\n\n", host)
    for _, port := range ports {
        result := scanWithBanner(host, port, 2*time.Second)
        if result.Open {
            if result.Banner != "" {
                fmt.Printf("%-6d open  banner: %s\n", result.Port, result.Banner)
            } else {
                fmt.Printf("%-6d open\n", result.Port)
            }
        }
    }
}
```

## Scanning Multiple Hosts

```go
// Scan all hosts in a /24 IPv4 range; subnet should be the first three octets
func scanSubnet(subnet string, port int, timeout time.Duration) {
    var wg sync.WaitGroup
    for i := 1; i < 255; i++ {
        host := fmt.Sprintf("%s.%d", subnet, i)  // e.g., "192.168.1.42"
        wg.Add(1)
        go func(h string) {
            defer wg.Done()
            if scanPort(h, port, timeout) {
                fmt.Printf("%s:%d is OPEN\n", h, port)
            }
        }(host)
    }
    wg.Wait()
}
```

## Conclusion

Go's concurrency primitives make it straightforward to build a fast port scanner. The semaphore pattern limits concurrent connection attempts and helps control resource usage while goroutines provide high throughput. Always obtain authorization before scanning systems you don't own.
