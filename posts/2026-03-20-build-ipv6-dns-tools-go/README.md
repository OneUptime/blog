# How to Build IPv6 DNS Tools in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, IPv6, DNS, AAAA, Miekg/dns, Network Tools

Description: Build IPv6 DNS tools in Go using the miekg/dns library for AAAA record queries, reverse DNS lookups, and DNS server implementation.

## Setup

```bash
go get github.com/miekg/dns
```

## AAAA Record Lookup

```go
package main

import (
    "net"
)

func lookupAAAA(hostname string) ([]string, error) {
    // Use net.LookupIP for simplicity
    ips, err := net.LookupIP(hostname)
    if err != nil {
        return nil, err
    }

    var ipv6Addrs []string
    for _, ip := range ips {
        if ip.To4() == nil && ip.To16() != nil {
            ipv6Addrs = append(ipv6Addrs, ip.String())
        }
    }
    return ipv6Addrs, nil
}
```

## DNS AAAA Query with miekg/dns

```go
package main

import (
    "fmt"
    "time"

    "github.com/miekg/dns"
)

func queryAAAA(hostname, dnsServer string) ([]string, error) {
    c := new(dns.Client)
    c.Timeout = 5 * time.Second

    // Create a DNS message
    m := new(dns.Msg)
    m.SetQuestion(dns.Fqdn(hostname), dns.TypeAAAA)
    m.RecursionDesired = true

    // Query the DNS server over IPv6
    r, _, err := c.Exchange(m, dnsServer)
    if err != nil {
        return nil, fmt.Errorf("DNS query failed: %w", err)
    }

    if r.Rcode != dns.RcodeSuccess {
        return nil, fmt.Errorf("DNS error: %s", dns.RcodeToString[r.Rcode])
    }

    var addresses []string
    for _, ans := range r.Answer {
        if aaaa, ok := ans.(*dns.AAAA); ok {
            addresses = append(addresses, aaaa.AAAA.String())
        }
    }
    return addresses, nil
}

func main() {
    // Query using Google's IPv6 DNS
    addrs, err := queryAAAA("ipv6.google.com", "[2001:4860:4860::8888]:53")
    if err != nil {
        fmt.Println("Error:", err)
        return
    }

    fmt.Println("AAAA records for ipv6.google.com:")
    for _, addr := range addrs {
        fmt.Printf("  %s\n", addr)
    }
}
```

## IPv6 Reverse DNS Lookup

```go
package main

import (
    "fmt"
    "net"
    "strings"

    "github.com/miekg/dns"
)

// reverseIPv6 converts an IPv6 address to its PTR query format
// e.g., "2001:db8::1" → "1.0.0.0...1.b.d.0.1.0.0.2.ip6.arpa."
func reverseIPv6(addr string) (string, error) {
    ip := net.ParseIP(addr)
    if ip == nil || ip.To4() != nil {
        return "", fmt.Errorf("not an IPv6 address: %s", addr)
    }

    // Expand to full form
    expanded := make([]byte, 32)
    for i, b := range ip.To16() {
        expanded[i*2] = "0123456789abcdef"[b>>4]
        expanded[i*2+1] = "0123456789abcdef"[b&0xf]
    }

    // Reverse and join with dots
    chars := strings.Split(string(expanded), "")
    for i, j := 0, len(chars)-1; i < j; i, j = i+1, j-1 {
        chars[i], chars[j] = chars[j], chars[i]
    }

    return strings.Join(chars, ".") + ".ip6.arpa.", nil
}

func reverseLookup(ipv6Addr string) ([]string, error) {
    ptrName, err := reverseIPv6(ipv6Addr)
    if err != nil {
        return nil, err
    }

    c := new(dns.Client)
    m := new(dns.Msg)
    m.SetQuestion(ptrName, dns.TypePTR)

    r, _, err := c.Exchange(m, "8.8.8.8:53")
    if err != nil {
        return nil, err
    }

    var names []string
    for _, ans := range r.Answer {
        if ptr, ok := ans.(*dns.PTR); ok {
            names = append(names, ptr.Ptr)
        }
    }
    return names, nil
}
```

## Simple IPv6 DNS Server

```go
package main

import (
    "fmt"
    "net"

    "github.com/miekg/dns"
)

// IPv6DNSServer serves AAAA records for a local zone
type IPv6DNSServer struct {
    records map[string]string  // hostname → IPv6 address
}

func (s *IPv6DNSServer) ServeDNS(w dns.ResponseWriter, r *dns.Msg) {
    m := new(dns.Msg)
    m.SetReply(r)
    m.Authoritative = true

    for _, q := range r.Question {
        if q.Qtype == dns.TypeAAAA {
            if ip, ok := s.records[q.Name]; ok {
                rr := &dns.AAAA{
                    Hdr: dns.RR_Header{
                        Name:   q.Name,
                        Rrtype: dns.TypeAAAA,
                        Class:  dns.ClassINET,
                        Ttl:    300,
                    },
                    AAAA: net.ParseIP(ip),
                }
                m.Answer = append(m.Answer, rr)
            }
        }
    }

    w.WriteMsg(m)
}

func main() {
    server := &IPv6DNSServer{
        records: map[string]string{
            "server1.home.lan.": "2001:db8:1::10",
            "server2.home.lan.": "2001:db8:1::20",
        },
    }

    // Listen on IPv6 only
    dns.HandleFunc("home.lan.", server.ServeDNS)
    udpServer := &dns.Server{
        Addr: "[::1]:5353",
        Net:  "udp6",
    }

    fmt.Println("IPv6 DNS server on [::1]:5353")
    if err := udpServer.ListenAndServe(); err != nil {
        panic(err)
    }
}
```

## Bulk AAAA Record Checker

```go
package main

import (
    "sync"
)

func checkAAAABulk(hostnames []string) map[string][]string {
    results := make(map[string][]string)
    var mu sync.Mutex
    var wg sync.WaitGroup
    sem := make(chan struct{}, 10)  // Limit concurrency

    for _, host := range hostnames {
        wg.Add(1)
        go func(h string) {
            defer wg.Done()
            sem <- struct{}{}
            defer func() { <-sem }()

            addrs, err := queryAAAA(h, "[2001:4860:4860::8888]:53")
            mu.Lock()
            if err == nil {
                results[h] = addrs
            } else {
                results[h] = nil
            }
            mu.Unlock()
        }(host)
    }

    wg.Wait()
    return results
}
```

## Conclusion

Building IPv6 DNS tools in Go is straightforward with the `miekg/dns` library. It supports AAAA queries over IPv6 resolvers, PTR record lookups for IPv6 reverse zones, and DNS server implementation. Combined with Go's concurrency, it enables efficient bulk DNS operations for network inventory and monitoring tasks.
