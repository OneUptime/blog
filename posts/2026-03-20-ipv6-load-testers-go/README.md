# How to Build IPv6 Load Testers in Go - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Go, Load Testing, Performance, HTTP

Description: Build IPv6 load testing tools in Go to benchmark servers, test dual-stack behavior, measure IPv6 connection latency, and validate IPv6 performance under load.

## Simple IPv6 HTTP Load Tester

```go
package main

import (
    "context"
    "flag"
    "fmt"
    "io"
    "net"
    "net/http"
    "sync"
    "sync/atomic"
    "time"
)

type LoadTestResult struct {
    TotalRequests   int64
    SuccessCount    int64
    ErrorCount      int64
    TotalLatency    int64   // nanoseconds
    MinLatency      int64
    MaxLatency      int64
}

func runIPv6LoadTest(target string, concurrency, requests int, forceIPv6 bool) *LoadTestResult {
    result := &LoadTestResult{MinLatency: 1<<62}
    dialer := &net.Dialer{
        Timeout:   10 * time.Second,
        KeepAlive: 30 * time.Second,
    }

    // Create IPv6-aware HTTP transport
    transport := &http.Transport{
        DialContext:         dialer.DialContext,
        MaxIdleConns:        concurrency,
        MaxIdleConnsPerHost: concurrency,
    }

    if forceIPv6 {
        // Override dialer to force IPv6
        transport.DialContext = func(ctx context.Context,
            _ string, addr string) (net.Conn, error) {
            return dialer.DialContext(ctx, "tcp6", addr)
        }
    }

    client := &http.Client{
        Transport: transport,
        Timeout:   15 * time.Second,
    }

    var wg sync.WaitGroup
    semaphore := make(chan struct{}, concurrency)

    for i := 0; i < requests; i++ {
        wg.Add(1)
        semaphore <- struct{}{}
        go func() {
            defer wg.Done()
            defer func() { <-semaphore }()

            start := time.Now()
            resp, err := client.Get(target)
            if err != nil {
                atomic.AddInt64(&result.TotalRequests, 1)
                atomic.AddInt64(&result.ErrorCount, 1)
                return
            }

            _, bodyErr := io.Copy(io.Discard, resp.Body)
            if closeErr := resp.Body.Close(); bodyErr == nil {
                bodyErr = closeErr
            }
            latency := time.Since(start).Nanoseconds()

            atomic.AddInt64(&result.TotalRequests, 1)
            if bodyErr != nil || resp.StatusCode >= 500 {
                atomic.AddInt64(&result.ErrorCount, 1)
                return
            }

            atomic.AddInt64(&result.SuccessCount, 1)
            atomic.AddInt64(&result.TotalLatency, latency)

            // Update min/max
            for {
                old := atomic.LoadInt64(&result.MinLatency)
                if latency >= old || atomic.CompareAndSwapInt64(&result.MinLatency, old, latency) {
                    break
                }
            }
            for {
                old := atomic.LoadInt64(&result.MaxLatency)
                if latency <= old || atomic.CompareAndSwapInt64(&result.MaxLatency, old, latency) {
                    break
                }
            }
        }()
    }

    wg.Wait()
    return result
}

func main() {
    target := flag.String("target", "http://[2001:db8::1]/", "Target URL")
    concurrency := flag.Int("c", 10, "Concurrent connections")
    requests := flag.Int("n", 100, "Total requests")
    ipv6only := flag.Bool("6", true, "Force IPv6 only")
    flag.Parse()

    fmt.Printf("IPv6 Load Test: %s (concurrency=%d, requests=%d)\n",
        *target, *concurrency, *requests)

    start := time.Now()
    result := runIPv6LoadTest(*target, *concurrency, *requests, *ipv6only)
    elapsed := time.Since(start)

    successPct := 0.0
    avgLatency := 0.0
    minLatency := 0.0
    maxLatency := 0.0
    if result.TotalRequests > 0 {
        successPct = float64(result.SuccessCount) / float64(result.TotalRequests) * 100
    }
    if result.SuccessCount > 0 {
        avgLatency = float64(result.TotalLatency) / float64(result.SuccessCount) / 1e6
        minLatency = float64(result.MinLatency) / 1e6
        maxLatency = float64(result.MaxLatency) / 1e6
    }

    fmt.Printf("\n=== Results ===\n")
    fmt.Printf("Duration:         %.2fs\n", elapsed.Seconds())
    fmt.Printf("Total requests:   %d\n", result.TotalRequests)
    fmt.Printf("Successful:       %d (%.1f%%)\n", result.SuccessCount, successPct)
    fmt.Printf("Errors:           %d\n", result.ErrorCount)
    fmt.Printf("Throughput:       %.1f req/s\n", float64(result.TotalRequests)/elapsed.Seconds())
    fmt.Printf("Avg latency:      %.2f ms\n", avgLatency)
    fmt.Printf("Min latency:      %.2f ms\n", minLatency)
    fmt.Printf("Max latency:      %.2f ms\n", maxLatency)
}
```

## Dual-Stack Comparison Test

```go
package main

import (
    "fmt"
    "net"
    "time"
)

type ProtocolResult struct {
    Protocol string
    Latency  time.Duration
    Error    error
}

func testBothProtocols(host string, port int) [2]ProtocolResult {
    var results [2]ProtocolResult
    done := make(chan ProtocolResult, 2)

    // Test IPv6
    go func() {
        start := time.Now()
        addr := net.JoinHostPort(host, fmt.Sprintf("%d", port))
        conn, err := net.DialTimeout("tcp6", addr, 5*time.Second)
        latency := time.Since(start)
        if err != nil {
            done <- ProtocolResult{"IPv6", latency, err}
            return
        }
        conn.Close()
        done <- ProtocolResult{"IPv6", latency, nil}
    }()

    // Test IPv4 if the hostname has A records
    go func() {
        time.Sleep(50 * time.Millisecond)
        start := time.Now()
        // Resolve IPv4 for same hostname
        addrs, err := net.LookupHost(host)
        if err != nil {
            done <- ProtocolResult{"IPv4", 0, err}
            return
        }
        var ipv4 string
        for _, a := range addrs {
            if net.ParseIP(a).To4() != nil {
                ipv4 = a
                break
            }
        }
        if ipv4 == "" {
            done <- ProtocolResult{"IPv4", 0, fmt.Errorf("no IPv4 address")}
            return
        }
        conn, err := net.DialTimeout("tcp4", net.JoinHostPort(ipv4, fmt.Sprintf("%d", port)), 5*time.Second)
        latency := time.Since(start)
        if err != nil {
            done <- ProtocolResult{"IPv4", latency, err}
            return
        }
        conn.Close()
        done <- ProtocolResult{"IPv4", latency, nil}
    }()

    for i := 0; i < 2; i++ {
        r := <-done
        results[i] = r
    }
    return results
}

func main() {
    hosts := []struct{ host string; port int }{
        {"example.com", 80},
        {"example.com", 443},
    }
    for _, h := range hosts {
        fmt.Printf("\nTesting %s:%d\n", h.host, h.port)
        results := testBothProtocols(h.host, h.port)
        for _, r := range results {
            if r.Error != nil {
                fmt.Printf("  %-6s: ERROR %v\n", r.Protocol, r.Error)
            } else {
                fmt.Printf("  %-6s: %.2f ms\n", r.Protocol, float64(r.Latency.Microseconds())/1000)
            }
        }
    }
}
```

## TCP Connection Flood Test (Rate-Limited)

```go
package main

import (
    "fmt"
    "net"
    "sync"
    "sync/atomic"
    "time"
)

func tcpConnectionTest(target string, ratePerSec int, duration time.Duration) {
    var established int64
    var failed int64

    if ratePerSec <= 0 {
        fmt.Println("ratePerSec must be greater than 0")
        return
    }

    interval := time.Second / time.Duration(ratePerSec)
    end := time.Now().Add(duration)
    var wg sync.WaitGroup

    fmt.Printf("TCP connection test: %s at %d conn/s for %v\n",
        target, ratePerSec, duration)

    for time.Now().Before(end) {
        wg.Add(1)
        go func() {
            defer wg.Done()
            conn, err := net.DialTimeout("tcp6", target, 5*time.Second)
            if err != nil {
                atomic.AddInt64(&failed, 1)
                return
            }
            atomic.AddInt64(&established, 1)
            conn.Close()
        }()
        time.Sleep(interval)
    }
    wg.Wait()

    total := established + failed
    successPct := 0.0
    if total > 0 {
        successPct = float64(established) / float64(total) * 100
    }
    fmt.Printf("Results: %d total, %d established (%.1f%%), %d failed\n",
        total, established, successPct, failed)
}

func main() {
    tcpConnectionTest("[2001:db8::1]:80", 100, 30*time.Second)
}
```

## Conclusion

IPv6 load testing in Go uses `net.DialTimeout("tcp6", "[addr]:port", timeout)` to force IPv6 connections and `http.Transport` with a custom `DialContext` to control address family selection. Use `sync/atomic` for thread-safe counters and goroutine pools with a semaphore channel to control concurrency. Compare IPv6 vs IPv4 performance by testing both protocols against the same dual-stack hostname; consistent latency differences can point to different routing or peering paths, but they should be interpreted in the context of your network and the remote service. For production load testing, use existing tools like `wrk` or `k6` with IPv6 targets (`http://[2001:db8::1]/`); build custom Go load testers when you need IPv6-specific metrics or protocol-level testing of TCP connection establishment rates.
