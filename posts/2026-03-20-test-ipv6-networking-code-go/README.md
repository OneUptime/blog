# How to Test IPv6 Networking Code in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, Testing, Unit Test, Integration Test, Networking

Description: Test IPv6 networking code in Go using in-process servers, network mocks, and integration tests with IPv6 loopback.

## Testing with IPv6 Loopback

Go tests can create real IPv6 servers and clients using the loopback address `::1`:

```go
package main

import (
    "io"
    "net"
    "testing"
    "time"
)

func startTestServer(t *testing.T) (string, func()) {
    t.Helper()

    // Listen on IPv6 loopback with random port
    ln, err := net.Listen("tcp6", "[::1]:0")
    if err != nil {
        t.Skipf("IPv6 not available: %v", err)
    }

    // Get the assigned port
    addr := ln.Addr().String()

    // Start echo server in background
    go func() {
        for {
            conn, err := ln.Accept()
            if err != nil {
                return
            }
            go func(c net.Conn) {
                defer c.Close()
                io.Copy(c, c) // Echo
            }(conn)
        }
    }()

    cleanup := func() { ln.Close() }
    return addr, cleanup
}

func TestIPv6TCPConnection(t *testing.T) {
    serverAddr, cleanup := startTestServer(t)
    defer cleanup()

    // Connect using IPv6
    conn, err := net.DialTimeout("tcp6", serverAddr, 5*time.Second)
    if err != nil {
        t.Fatalf("Failed to connect to %s: %v", serverAddr, err)
    }
    defer conn.Close()

    // Send data and verify echo
    msg := []byte("Hello IPv6!")
    if _, err := conn.Write(msg); err != nil {
        t.Fatalf("Write failed: %v", err)
    }

    buf := make([]byte, len(msg))
    if _, err := io.ReadFull(conn, buf); err != nil {
        t.Fatalf("Read failed: %v", err)
    }

    if string(buf) != string(msg) {
        t.Errorf("Echo mismatch: got %s, want %s", buf, msg)
    }
}
```

## Table-Driven Tests for Address Parsing

```go
package main

import (
    "net/netip"
    "testing"
)

func TestIPv6Parsing(t *testing.T) {
    tests := []struct {
        name      string
        input     string
        wantErr   bool
        wantAddr  string
        wantIs6   bool
    }{
        {
            name:     "documentation address",
            input:    "2001:db8::1",
            wantAddr: "2001:db8::1",
            wantIs6:  true,
        },
        {
            name:     "loopback",
            input:    "::1",
            wantAddr: "::1",
            wantIs6:  true,
        },
        {
            name:     "expanded form",
            input:    "2001:0db8:0000:0000:0000:0000:0000:0001",
            wantAddr: "2001:db8::1",  // Should normalize
            wantIs6:  true,
        },
        {
            name:     "link-local with zone",
            input:    "fe80::1%eth0",
            wantAddr: "fe80::1%eth0",
            wantIs6:  true,
        },
        {
            name:    "invalid",
            input:   "not-an-ip",
            wantErr: true,
        },
        {
            name:    "ipv4 input",
            input:   "192.168.1.1",
            wantIs6: false,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            addr, err := netip.ParseAddr(tt.input)

            if tt.wantErr {
                if err == nil {
                    t.Error("Expected error but got none")
                }
                return
            }

            if err != nil {
                t.Fatalf("Unexpected error: %v", err)
            }

            if addr.Is6() != tt.wantIs6 {
                t.Errorf("Is6() = %v, want %v", addr.Is6(), tt.wantIs6)
            }

            if tt.wantAddr != "" && addr.String() != tt.wantAddr {
                t.Errorf("String() = %s, want %s", addr.String(), tt.wantAddr)
            }
        })
    }
}
```

## Testing HTTP Handlers with IPv6

```go
package main

import (
    "net"
    "net/http"
    "net/http/httptest"
    "net/netip"
    "strings"
    "testing"
)

func GetClientIP(req *http.Request) (netip.Addr, error) {
    host := req.RemoteAddr
    if forwardedFor := req.Header.Get("X-Forwarded-For"); forwardedFor != "" {
        host, _, _ = strings.Cut(forwardedFor, ",")
        host = strings.TrimSpace(host)
    } else {
        var err error
        host, _, err = net.SplitHostPort(req.RemoteAddr)
        if err != nil {
            return netip.Addr{}, err
        }
    }

    addr, err := netip.ParseAddr(host)
    if err != nil {
        return netip.Addr{}, err
    }
    return addr.Unmap(), nil
}

func TestClientIPExtractionIPv6(t *testing.T) {
    tests := []struct {
        name       string
        remoteAddr string
        xForwardedFor string
        wantIP     string
    }{
        {
            name:       "direct IPv6",
            remoteAddr: "[2001:db8::1]:12345",
            wantIP:     "2001:db8::1",
        },
        {
            name:          "proxied IPv6",
            remoteAddr:    "[::1]:12345",
            xForwardedFor: "2001:db8::100",
            wantIP:        "2001:db8::100",
        },
        {
            name:       "IPv4-mapped IPv6",
            remoteAddr: "[::ffff:192.0.2.1]:54321",
            wantIP:     "192.0.2.1",  // Should unmap
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest(http.MethodGet, "/", nil)
            req.RemoteAddr = tt.remoteAddr
            if tt.xForwardedFor != "" {
                req.Header.Set("X-Forwarded-For", tt.xForwardedFor)
            }

            ip, err := GetClientIP(req)
            if err != nil {
                t.Fatalf("GetClientIP error: %v", err)
            }

            if ip.String() != tt.wantIP {
                t.Errorf("IP = %s, want %s", ip, tt.wantIP)
            }
        })
    }
}
```

## Skipping Tests When IPv6 is Unavailable

```go
func requireIPv6(t *testing.T) {
    t.Helper()
    // Try to create an IPv6 socket to check availability
    l, err := net.Listen("tcp6", "[::1]:0")
    if err != nil {
        t.Skip("IPv6 not available on this system:", err)
    }
    l.Close()
}

func TestIPv6OnlyServer(t *testing.T) {
    requireIPv6(t)
    // ... rest of test
}
```

## Conclusion

Testing IPv6 networking code in Go is straightforward using the `::1` loopback address for integration tests. Use `net.Listen("tcp6", "[::1]:0")` to get a random available port, table-driven tests for address parsing logic, and `httptest.NewRequest` for HTTP handler testing with mock IPv6 addresses. Skip IPv6 tests gracefully when the test environment doesn't support IPv6.
