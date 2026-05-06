# How to Configure Gin (Go) for IPv6 Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Gin, Go, Golang, IPv6, Web Framework, Dual-Stack, Net/http

Description: Configure the Gin web framework to listen on IPv6, extract client IPv6 addresses, and handle IPv6 in middleware using Go's standard net/netip package.

## Introduction

Gin uses Go's `net/http` package under the hood. To bind explicitly on IPv6, pass an IPv6 address or `[::]:port` as the bind address to `gin.Run()` or a custom `http.Server`. Listening on `[::]:port` binds the IPv6 unspecified address; whether that also accepts IPv4 connections depends on the OS and socket configuration. Go's `net/netip` package (1.18+) provides efficient IPv6 address parsing. If you rely on proxy headers for client IPs, configure Gin's trusted proxies before using `c.ClientIP()`.

## Step 1: Listen on IPv6

```go
// main.go
package main

import (
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()

    r.GET("/", func(c *gin.Context) {
        c.JSON(200, gin.H{"hello": "ipv6"})
    })

    // Listen on all IPv6 interfaces; IPv4 dual-stack behavior is OS-dependent
    r.Run("[::]:8080")
}
```

```go
// With custom server for IPv6-only
package main

import (
    "net"
    "net/http"

    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()

    server := &http.Server{
        Addr:    "[::]:8080",
        Handler: r,
    }

    // For IPv6-only (no IPv4 dual-stack)
    ln, err := net.Listen("tcp6", "[::]:8080")
    if err != nil {
        panic(err)
    }
    if err := server.Serve(ln); err != nil && err != http.ErrServerClosed {
        panic(err)
    }
}
```

## Step 2: Get Client IPv6 Address

```go
// middleware/client_ip.go
package middleware

import (
    "net/netip"

    "github.com/gin-gonic/gin"
)

func ClientIPMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        ip := extractClientIP(c)
        c.Set("client_ip", ip)
        c.Next()
    }
}

func extractClientIP(c *gin.Context) string {
    // ClientIP respects Gin's trusted proxy settings.
    rawIP := c.ClientIP()

    // Normalize IPv4-mapped IPv6
    if addr, err := netip.ParseAddr(rawIP); err == nil {
        if addr.Is4In6() {
            return addr.Unmap().String()
        }
        return addr.String()
    }

    return rawIP
}
```

## Step 3: IPv6 Address Validation

```go
// handlers/network.go
package handlers

import (
    "fmt"
    "net/netip"

    "github.com/gin-gonic/gin"
)

type EndpointRequest struct {
    Address string `json:"address" binding:"required"`
    Port    int    `json:"port" binding:"required,min=1,max=65535"`
}

// Register with: r.POST("/endpoint", CreateEndpoint)
func CreateEndpoint(c *gin.Context) {
    var req EndpointRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    addr, err := netip.ParseAddr(req.Address)
    if err != nil {
        c.JSON(400, gin.H{"error": "invalid IP address"})
        return
    }

    addr = addr.Unmap()

    if addr.Zone() != "" {
        c.JSON(400, gin.H{"error": "scoped IPv6 addresses not allowed"})
        return
    }

    if addr.IsLoopback() {
        c.JSON(400, gin.H{"error": "loopback addresses not allowed"})
        return
    }

    var url string
    if addr.Is6() {
        url = fmt.Sprintf("http://[%s]:%d", addr.String(), req.Port)
    } else {
        url = fmt.Sprintf("http://%s:%d", addr.String(), req.Port)
    }

    c.JSON(200, gin.H{
        "address":  addr.String(),
        "is_ipv6":  addr.Is6(),
        "url":      url,
    })
}
```

## Step 4: Rate Limiting by /64 Subnet

```go
// middleware/rate_limit.go
package middleware

import (
    "net/netip"
    "sync"
    "time"
)

type RateLimiter struct {
    mu       sync.Mutex
    counters map[string][]time.Time
    limit    int
    window   time.Duration
}

func (rl *RateLimiter) getKey(ip string) string {
    addr, err := netip.ParseAddr(ip)
    if err != nil || !addr.Is6() || addr.Is4In6() {
        return ip
    }
    // Rate limit by /64
    prefix, _ := addr.Prefix(64)
    return prefix.String()
}

func (rl *RateLimiter) Allow(ip string) bool {
    key := rl.getKey(ip)
    rl.mu.Lock()
    defer rl.mu.Unlock()
    if rl.counters == nil {
        rl.counters = make(map[string][]time.Time)
    }
    now := time.Now()
    // filter old entries
    filtered := rl.counters[key][:0]
    for _, t := range rl.counters[key] {
        if now.Sub(t) < rl.window {
            filtered = append(filtered, t)
        }
    }
    filtered = append(filtered, now)
    rl.counters[key] = filtered
    return len(filtered) <= rl.limit
}
```

## Step 5: Test

```bash
go run main.go

# Test IPv6

curl -6 http://[::1]:8080/
# After registering POST /endpoint:
curl -6 http://[::1]:8080/endpoint \
    -H 'Content-Type: application/json' \
    -d '{"address":"2001:db8::42","port":443}'

# Verify listening
ss -lntp | grep :8080
```

## Conclusion

Binding to `[::]:8080` listens on the IPv6 unspecified address, and whether that also accepts IPv4 connections is OS-dependent. Use `net.Listen("tcp6", ...)` for IPv6-only mode. Use `net/netip.ParseAddr` for efficient IPv6 address parsing. The `Is4In6()` method identifies IPv4-mapped addresses for normalization. Rate-limit by /64 prefixes using `addr.Prefix(64)`. Monitor Gin endpoints with OneUptime's IPv6 HTTP checks.
