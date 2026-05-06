# How to Build IPv6 Load Testers in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Load Testing, HTTP, Performance, Concurrency

Description: Build IPv6 load testing tools in Go that generate concurrent HTTP and TCP connections to measure performance of IPv6-enabled services.

## Simple IPv6 HTTP Load Tester

```go
package main

import (
    "context"
    "fmt"
    "io"
    "net"
    "net/http"
    "sync"
    "sync/atomic"
    "time"
)

type LoadTestConfig struct {
    TargetURL    string
    Concurrency  int
    Duration     time.Duration
    IPv6Only     bool
}

type LoadTestResult struct {
    TotalRequests  int64
    SuccessCount   int64
    ErrorCount     int64
    Duration       time.Duration
    AvgLatencyMs   float64
}

func RunIPv6LoadTest(cfg LoadTestConfig) LoadTestResult {
    // Create HTTP client with IPv6-only transport
    transport := &http.Transport{
        DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
            dialer := &net.Dialer{Timeout: 10 * time.Second}
            if cfg.IPv6Only {
                return dialer.DialContext(ctx, "tcp6", addr)
            }
            return dialer.DialContext(ctx, "tcp", addr)
        },
        MaxIdleConns:        cfg.Concurrency * 2,
        IdleConnTimeout:     90 * time.Second,
        TLSHandshakeTimeout: 10 * time.Second,
        DisableKeepAlives:   false,
    }

    client := &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }

    var (
        totalRequests  int64
        successCount   int64
        errorCount     int64
        totalLatencyMs int64
        wg             sync.WaitGroup
    )

    ctx, cancel := context.WithTimeout(context.Background(), cfg.Duration)
    defer cancel()

    start := time.Now()

    // Launch concurrent workers
    for i := 0; i < cfg.Concurrency; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for {
                select {
                case <-ctx.Done():
                    return
                default:
                    reqStart := time.Now()
                    req, err := http.NewRequestWithContext(ctx, http.MethodGet, cfg.TargetURL, nil)
                    if err != nil {
                        atomic.AddInt64(&errorCount, 1)
                        return
                    }

                    resp, err := client.Do(req)
                    latency := time.Since(reqStart).Milliseconds()

                    atomic.AddInt64(&totalRequests, 1)
                    atomic.AddInt64(&totalLatencyMs, latency)

                    if err != nil {
                        atomic.AddInt64(&errorCount, 1)
                    } else {
                        _, _ = io.Copy(io.Discard, resp.Body)
                        resp.Body.Close()
                        if resp.StatusCode < 400 {
                            atomic.AddInt64(&successCount, 1)
                        } else {
                            atomic.AddInt64(&errorCount, 1)
                        }
                    }
                }
            }
        }()
    }

    wg.Wait()
    elapsed := time.Since(start)

    total := atomic.LoadInt64(&totalRequests)
    avgLatency := float64(0)
    if total > 0 {
        avgLatency = float64(atomic.LoadInt64(&totalLatencyMs)) / float64(total)
    }

    return LoadTestResult{
        TotalRequests: total,
        SuccessCount:  atomic.LoadInt64(&successCount),
        ErrorCount:    atomic.LoadInt64(&errorCount),
        Duration:      elapsed,
        AvgLatencyMs:  avgLatency,
    }
}

func main() {
    cfg := LoadTestConfig{
        TargetURL:   "http://[2001:db8::1]:8080/health",
        Concurrency: 50,
        Duration:    30 * time.Second,
        IPv6Only:    true,
    }

    fmt.Printf("Starting IPv6 load test: %d concurrent, %s duration\n",
        cfg.Concurrency, cfg.Duration)

    result := RunIPv6LoadTest(cfg)

    rps := float64(result.TotalRequests) / result.Duration.Seconds()
    fmt.Printf("\nResults:\n")
    fmt.Printf("  Total requests: %d\n", result.TotalRequests)
    fmt.Printf("  Successful:     %d\n", result.SuccessCount)
    fmt.Printf("  Errors:         %d\n", result.ErrorCount)
    fmt.Printf("  Requests/sec:   %.1f\n", rps)
    fmt.Printf("  Avg latency:    %.1f ms\n", result.AvgLatencyMs)
}
```

## TCP Connection Rate Tester

```go
package main

import (
    "fmt"
    "net"
    "sync"
    "sync/atomic"
    "time"
)

func measureIPv6ConnectRate(host string, port int, duration time.Duration, workers int) {
    target := net.JoinHostPort(host, fmt.Sprintf("%d", port))
    var connected, failed int64
    stop := time.After(duration)
    start := time.Now()

    sem := make(chan struct{}, workers)
    var wg sync.WaitGroup

    for {
        select {
        case <-stop:
            wg.Wait()
            elapsed := time.Since(start)
            success := atomic.LoadInt64(&connected)
            failures := atomic.LoadInt64(&failed)
            total := success + failures
            fmt.Printf("TCP Connect Rate to [%s]:%d\n", host, port)
            fmt.Printf("  Connections: %d in %.1fs\n", total, elapsed.Seconds())
            fmt.Printf("  Rate: %.0f conn/sec\n", float64(total)/elapsed.Seconds())
            fmt.Printf("  Success: %d, Failed: %d\n", success, failures)
            return
        case sem <- struct{}{}:
            wg.Add(1)
            go func() {
                defer wg.Done()
                defer func() { <-sem }()
                conn, err := net.DialTimeout("tcp6", target, 5*time.Second)
                if err != nil {
                    atomic.AddInt64(&failed, 1)
                } else {
                    atomic.AddInt64(&connected, 1)
                    conn.Close()
                }
            }()
        }
    }
}

func main() {
    measureIPv6ConnectRate("::1", 8080, 10*time.Second, 100)
}
```

## Latency Statistics

```go
package main

import (
    "fmt"
    "math"
    "sort"
    "time"
)

func printLatencyStats(latencies []time.Duration) {
    if len(latencies) == 0 {
        fmt.Println("No data")
        return
    }

    sort.Slice(latencies, func(i, j int) bool {
        return latencies[i] < latencies[j]
    })

    n := len(latencies)
    p50 := latencies[int(math.Ceil(float64(n)*0.50))-1]
    p95 := latencies[int(math.Ceil(float64(n)*0.95))-1]
    p99 := latencies[int(math.Ceil(float64(n)*0.99))-1]

    var total time.Duration
    for _, l := range latencies {
        total += l
    }
    avg := total / time.Duration(n)

    fmt.Printf("Latency Statistics (n=%d):\n", n)
    fmt.Printf("  Min:  %v\n", latencies[0])
    fmt.Printf("  P50:  %v\n", p50)
    fmt.Printf("  P95:  %v\n", p95)
    fmt.Printf("  P99:  %v\n", p99)
    fmt.Printf("  Max:  %v\n", latencies[n-1])
    fmt.Printf("  Avg:  %v\n", avg)
}
```

## Conclusion

Building IPv6 load testers in Go leverages its excellent concurrency model. The `sync/atomic` package provides atomic operations for concurrent request tracking. By customizing the `http.Transport.DialContext` to use `"tcp6"`, outbound TCP dials use IPv6. This enables accurate performance testing of IPv6-only or dual-stack services.
