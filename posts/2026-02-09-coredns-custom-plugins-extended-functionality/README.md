# How to Implement CoreDNS Custom Plugins for Extended DNS Functionality

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, DNS, Go, Plugins

Description: Learn how to develop and deploy custom CoreDNS plugins to extend DNS functionality in Kubernetes with domain-specific logic, custom record types, and advanced query handling.

---

CoreDNS's plugin architecture makes it incredibly extensible. While the built-in plugins cover most use cases, sometimes you need custom logic for specialized DNS behavior. Whether you want to implement custom authorization, integrate with proprietary systems, or add unique record types, building a CoreDNS plugin gives you complete control.

## Understanding CoreDNS Plugin Architecture

CoreDNS plugins are Go packages that implement specific interfaces. Each plugin in the chain gets a chance to handle a DNS query. Plugins can:

- Modify queries before passing them down the chain
- Generate responses and stop processing
- Add metadata to responses
- Log or monitor queries
- Integrate with external systems

The plugin chain processes queries in the order defined in the Corefile. Understanding this flow is key to building effective plugins.

## Setting Up Your Development Environment

Before writing plugins, set up a proper development environment:

```bash
# Clone CoreDNS
git clone https://github.com/coredns/coredns.git
cd coredns

# Install Go (1.21 or later required)
go version

# Build CoreDNS to verify setup
make
./coredns -version
```

Create a workspace for your custom plugin:

```bash
mkdir -p ~/coredns-plugins/ipfilter
cd ~/coredns-plugins/ipfilter
go mod init github.com/yourusername/coredns-ipfilter
```

## Building a Simple IP Filter Plugin

Let's build a plugin that blocks DNS queries from specific IP addresses. This demonstrates the core concepts.

Create `setup.go` for plugin initialization:

```go
// setup.go
package ipfilter

import (
    "github.com/coredns/caddy"
    "github.com/coredns/coredns/core/dnsserver"
    "github.com/coredns/coredns/plugin"
    "net"
)

// init registers the plugin with CoreDNS
func init() {
    plugin.Register("ipfilter", setup)
}

// setup parses the Corefile configuration
func setup(c *caddy.Controller) error {
    ipf, err := parseConfig(c)
    if err != nil {
        return plugin.Error("ipfilter", err)
    }

    dnsserver.GetConfig(c).AddPlugin(func(next plugin.Handler) plugin.Handler {
        ipf.Next = next
        return ipf
    })

    return nil
}

// parseConfig reads configuration from Corefile
func parseConfig(c *caddy.Controller) (*IPFilter, error) {
    ipf := &IPFilter{
        blocklist: make(map[string]bool),
    }

    for c.Next() {
        args := c.RemainingArgs()

        // ipfilter {
        //     block 192.168.1.100
        //     block 10.0.0.0/24
        // }
        for c.NextBlock() {
            switch c.Val() {
            case "block":
                if !c.NextArg() {
                    return nil, c.ArgErr()
                }
                ipf.blocklist[c.Val()] = true
            default:
                return nil, c.Errf("unknown property: %s", c.Val())
            }
        }
    }

    return ipf, nil
}
```

Now implement the plugin handler in `ipfilter.go`:

```go
// ipfilter.go
package ipfilter

import (
    "context"
    "net"

    "github.com/coredns/coredns/plugin"
    "github.com/coredns/coredns/request"
    "github.com/miekg/dns"
)

// IPFilter is a plugin that blocks queries from specific IPs
type IPFilter struct {
    Next      plugin.Handler
    blocklist map[string]bool
}

// Name returns the plugin name
func (ipf *IPFilter) Name() string {
    return "ipfilter"
}

// ServeDNS implements the plugin.Handler interface
func (ipf *IPFilter) ServeDNS(ctx context.Context, w dns.ResponseWriter, r *dns.Msg) (int, error) {
    state := request.Request{W: w, Req: r}

    // Get client IP
    clientIP, _, err := net.SplitHostPort(state.IP())
    if err != nil {
        return dns.RcodeServerFailure, err
    }

    // Check if IP is blocked
    if ipf.isBlocked(clientIP) {
        // Return REFUSED
        m := new(dns.Msg)
        m.SetRcode(r, dns.RcodeRefused)
        w.WriteMsg(m)
        return dns.RcodeRefused, nil
    }

    // IP is allowed, pass to next plugin
    return plugin.NextOrFailure(ipf.Name(), ipf.Next, ctx, w, r)
}

// isBlocked checks if an IP is in the blocklist
func (ipf *IPFilter) isBlocked(ip string) bool {
    // Check exact match
    if ipf.blocklist[ip] {
        return true
    }

    // Check CIDR ranges
    parsedIP := net.ParseIP(ip)
    for blocked := range ipf.blocklist {
        // Try parsing as CIDR
        _, network, err := net.ParseCIDR(blocked)
        if err == nil && network.Contains(parsedIP) {
            return true
        }
    }

    return false
}
```

## Building a Query Rewriting Plugin

A more advanced example: rewrite queries based on custom logic. This plugin rewrites service discovery queries:

```go
// rewriter.go
package servicerewriter

import (
    "context"
    "strings"

    "github.com/coredns/coredns/plugin"
    "github.com/coredns/coredns/request"
    "github.com/miekg/dns"
)

type ServiceRewriter struct {
    Next     plugin.Handler
    mappings map[string]string
}

func (sr *ServiceRewriter) Name() string {
    return "servicerewriter"
}

func (sr *ServiceRewriter) ServeDNS(ctx context.Context, w dns.ResponseWriter, r *dns.Msg) (int, error) {
    state := request.Request{W: w, Req: r}

    // Get the query name
    qname := state.Name()

    // Check if we should rewrite this query
    if newName, ok := sr.shouldRewrite(qname); ok {
        // Create new request with rewritten name
        newReq := r.Copy()
        newReq.Question[0].Name = newName

        // Create response writer that will rewrite answers back
        rw := &rewriteWriter{
            ResponseWriter: w,
            originalName:   qname,
            rewrittenName:  newName,
        }

        // Pass rewritten request down the chain
        return plugin.NextOrFailure(sr.Name(), sr.Next, ctx, rw, newReq)
    }

    return plugin.NextOrFailure(sr.Name(), sr.Next, ctx, w, r)
}

func (sr *ServiceRewriter) shouldRewrite(name string) (string, bool) {
    // Example: rewrite service.env to service.env.svc.cluster.local
    for pattern, replacement := range sr.mappings {
        if strings.HasSuffix(name, pattern) {
            newName := strings.Replace(name, pattern, replacement, 1)
            return dns.Fqdn(newName), true
        }
    }
    return "", false
}

// rewriteWriter wraps dns.ResponseWriter to rewrite responses
type rewriteWriter struct {
    dns.ResponseWriter
    originalName  string
    rewrittenName string
}

func (w *rewriteWriter) WriteMsg(m *dns.Msg) error {
    // Rewrite answer section back to original name
    for i := range m.Answer {
        if m.Answer[i].Header().Name == w.rewrittenName {
            m.Answer[i].Header().Name = w.originalName
        }
    }
    return w.ResponseWriter.WriteMsg(m)
}
```

## Building a Database-Backed Plugin

For enterprise scenarios, you might need DNS records stored in a database. Here's a plugin that queries PostgreSQL:

```go
// dbrecords.go
package dbrecords

import (
    "context"
    "database/sql"
    "fmt"

    "github.com/coredns/coredns/plugin"
    "github.com/coredns/coredns/request"
    "github.com/miekg/dns"
    _ "github.com/lib/pq"
)

type DBRecords struct {
    Next plugin.Handler
    db   *sql.DB
}

func (dr *DBRecords) Name() string {
    return "dbrecords"
}

func (dr *DBRecords) ServeDNS(ctx context.Context, w dns.ResponseWriter, r *dns.Msg) (int, error) {
    state := request.Request{W: w, Req: r}

    // Query database for records
    records, err := dr.queryRecords(state.Name(), state.QType())
    if err != nil {
        return dns.RcodeServerFailure, err
    }

    if len(records) == 0 {
        // No records found, pass to next plugin
        return plugin.NextOrFailure(dr.Name(), dr.Next, ctx, w, r)
    }

    // Build response
    m := new(dns.Msg)
    m.SetReply(r)
    m.Authoritative = true

    for _, record := range records {
        rr, err := dns.NewRR(record)
        if err != nil {
            continue
        }
        m.Answer = append(m.Answer, rr)
    }

    w.WriteMsg(m)
    return dns.RcodeSuccess, nil
}

func (dr *DBRecords) queryRecords(name string, qtype uint16) ([]string, error) {
    query := `
        SELECT rdata
        FROM dns_records
        WHERE name = $1 AND type = $2
    `

    rows, err := dr.db.Query(query, name, dns.TypeToString[qtype])
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var records []string
    for rows.Next() {
        var rdata string
        if err := rows.Scan(&rdata); err != nil {
            return nil, err
        }
        // Format as complete RR
        record := fmt.Sprintf("%s 300 IN %s %s", name, dns.TypeToString[qtype], rdata)
        records = append(records, record)
    }

    return records, rows.Err()
}
```

## Integrating Your Plugin into CoreDNS

To use your custom plugin, you need to compile it into CoreDNS. Edit the CoreDNS `plugin.cfg` file:

```bash
cd ~/coredns
# Edit plugin.cfg to add your plugin
```

Add your plugin to the list (order matters):

```
# plugin.cfg
# ...existing plugins...
ipfilter:github.com/yourusername/coredns-ipfilter
servicerewriter:github.com/yourusername/coredns-servicerewriter
dbrecords:github.com/yourusername/coredns-dbrecords
# ...more plugins...
```

Update dependencies and build:

```bash
go get github.com/yourusername/coredns-ipfilter@latest
go generate
make
```

This creates a CoreDNS binary with your custom plugins compiled in.

## Deploying Custom CoreDNS Builds to Kubernetes

Build a container image with your custom CoreDNS:

```dockerfile
# Dockerfile
FROM golang:1.21 as builder

WORKDIR /build
COPY . .

RUN go get github.com/yourusername/coredns-ipfilter@latest && \
    go generate && \
    make

FROM alpine:3.18
RUN apk add --no-cache ca-certificates

COPY --from=builder /build/coredns /coredns

EXPOSE 53 53/udp
ENTRYPOINT ["/coredns"]
```

Build and push:

```bash
docker build -t your-registry/coredns-custom:1.0.0 .
docker push your-registry/coredns-custom:1.0.0
```

Update the CoreDNS deployment to use your image:

```bash
kubectl set image deployment/coredns -n kube-system \
  coredns=your-registry/coredns-custom:1.0.0
```

Update the Corefile to use your plugins:

```yaml
.:53 {
    errors
    health
    ready

    # Your custom IP filter plugin
    ipfilter {
        block 192.168.1.100
        block 10.50.0.0/16
    }

    # Your service rewriter
    servicerewriter {
        .prod api.production.svc.cluster.local
        .stage api.staging.svc.cluster.local
    }

    kubernetes cluster.local in-addr.arpa ip6.arpa {
        pods insecure
        fallthrough in-addr.arpa ip6.arpa
    }

    forward . /etc/resolv.conf
    cache 30
    reload
}
```

## Testing Your Custom Plugin

Write tests for your plugin:

```go
// ipfilter_test.go
package ipfilter

import (
    "context"
    "testing"

    "github.com/coredns/coredns/plugin/pkg/dnstest"
    "github.com/coredns/coredns/plugin/test"
    "github.com/miekg/dns"
)

func TestIPFilter(t *testing.T) {
    ipf := &IPFilter{
        Next: test.NextHandler(dns.RcodeSuccess, nil),
        blocklist: map[string]bool{
            "192.168.1.100": true,
            "10.0.0.0/24":   true,
        },
    }

    tests := []struct {
        name       string
        clientIP   string
        expectCode int
    }{
        {"allowed IP", "192.168.1.50", dns.RcodeSuccess},
        {"blocked exact IP", "192.168.1.100", dns.RcodeRefused},
        {"blocked CIDR", "10.0.0.50", dns.RcodeRefused},
        {"allowed outside CIDR", "10.0.1.50", dns.RcodeSuccess},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := new(dns.Msg)
            req.SetQuestion("example.com.", dns.TypeA)

            rec := dnstest.NewRecorder(&test.ResponseWriter{
                RemoteIP: tt.clientIP,
            })

            code, err := ipf.ServeDNS(context.Background(), rec, req)
            if err != nil {
                t.Fatalf("Expected no error, got %v", err)
            }

            if code != tt.expectCode {
                t.Errorf("Expected code %d, got %d", tt.expectCode, code)
            }
        })
    }
}
```

Run tests:

```bash
go test -v
```

## Best Practices for Plugin Development

When building CoreDNS plugins:

- Keep plugins focused on a single responsibility
- Handle errors gracefully and return appropriate DNS error codes
- Always call the next plugin in the chain unless you're definitively answering the query
- Add metrics using the Prometheus plugin interfaces
- Write comprehensive tests including edge cases
- Document configuration options clearly
- Use structured logging for debugging
- Consider performance implications, especially for high-QPS scenarios
- Version your plugin following semantic versioning

Custom CoreDNS plugins unlock unlimited possibilities for DNS customization in Kubernetes. Whether you need integration with proprietary systems, custom authorization logic, or specialized record handling, the plugin architecture gives you the flexibility to implement exactly what you need.
