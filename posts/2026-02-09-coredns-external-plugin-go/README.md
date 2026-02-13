# How to Implement CoreDNS External Plugin Development Using Go and Plugin API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, CoreDNS, Go, Development

Description: Learn how to develop custom CoreDNS plugins using Go and the CoreDNS plugin API, extending DNS functionality with custom logic for specialized resolution requirements and integrations.

---

CoreDNS's plugin architecture allows you to extend its functionality by creating custom plugins. Whether you need specialized DNS resolution logic, integration with external systems, or custom query processing, developing external plugins provides the flexibility to implement exactly what your infrastructure requires.

This guide shows you how to develop, build, and deploy custom CoreDNS plugins using Go.

## Understanding CoreDNS Plugin Architecture

CoreDNS plugins implement the `plugin.Handler` interface:

```go
type Handler interface {
    ServeDNS(context.Context, dns.ResponseWriter, *dns.Msg) (int, error)
    Name() string
}
```

Key concepts:

- **ServeDNS**: Main query processing method
- **Context**: Request context for cancellation and metadata
- **ResponseWriter**: Write DNS responses
- **dns.Msg**: DNS query message
- **Return codes**: dns.RcodeSuccess, dns.RcodeNameError, etc.

## Setting Up Development Environment

Create project structure:

```bash
mkdir -p coredns-custom-plugin
cd coredns-custom-plugin

# Initialize Go module
go mod init github.com/yourname/coredns-custom-plugin

# Add CoreDNS dependency
go get github.com/coredns/coredns
```

## Creating a Basic Plugin

Create `plugin.go`:

```go
package customplugin

import (
    "context"
    "fmt"

    "github.com/coredns/coredns/plugin"
    "github.com/miekg/dns"
)

// CustomPlugin implements the plugin.Handler interface
type CustomPlugin struct {
    Next plugin.Handler
}

// ServeDNS implements the plugin.Handler interface
func (cp *CustomPlugin) ServeDNS(ctx context.Context, w dns.ResponseWriter, r *dns.Msg) (int, error) {
    // Log the query
    fmt.Printf("Received query for: %s\n", r.Question[0].Name)

    // Example: Return a custom A record for "test.example.com"
    if r.Question[0].Name == "test.example.com." && r.Question[0].Qtype == dns.TypeA {
        msg := new(dns.Msg)
        msg.SetReply(r)
        msg.Authoritative = true

        // Create A record
        rr := &dns.A{
            Hdr: dns.RR_Header{
                Name:   r.Question[0].Name,
                Rrtype: dns.TypeA,
                Class:  dns.ClassINET,
                Ttl:    300,
            },
            A: net.ParseIP("192.168.1.100"),
        }
        msg.Answer = append(msg.Answer, rr)

        w.WriteMsg(msg)
        return dns.RcodeSuccess, nil
    }

    // Pass to next plugin if we don't handle this query
    return plugin.NextOrFailure(cp.Name(), cp.Next, ctx, w, r)
}

// Name returns the plugin name
func (cp *CustomPlugin) Name() string {
    return "customplugin"
}
```

## Implementing Plugin Setup

Create `setup.go`:

```go
package customplugin

import (
    "github.com/coredns/coredns/core/dnsserver"
    "github.com/coredns/coredns/plugin"
    "github.com/coredns/caddy"
)

func init() {
    plugin.Register("customplugin", setup)
}

func setup(c *caddy.Controller) error {
    c.Next() // Move past plugin name

    // Parse configuration
    config, err := parseConfig(c)
    if err != nil {
        return plugin.Error("customplugin", err)
    }

    // Create plugin instance
    cp := &CustomPlugin{
        Config: config,
    }

    // Add plugin to chain
    dnsserver.GetConfig(c).AddPlugin(func(next plugin.Handler) plugin.Handler {
        cp.Next = next
        return cp
    })

    return nil
}

func parseConfig(c *caddy.Controller) (*Config, error) {
    config := &Config{}

    for c.NextBlock() {
        switch c.Val() {
        case "option1":
            if !c.NextArg() {
                return nil, c.ArgErr()
            }
            config.Option1 = c.Val()
        case "option2":
            if !c.NextArg() {
                return nil, c.ArgErr()
            }
            config.Option2 = c.Val()
        default:
            return nil, c.Errf("unknown property '%s'", c.Val())
        }
    }

    return config, nil
}

type Config struct {
    Option1 string
    Option2 string
}
```

## Advanced Plugin with External Data

Create a plugin that queries an external API:

```go
package apilookup

import (
    "context"
    "encoding/json"
    "fmt"
    "net"
    "net/http"
    "time"

    "github.com/coredns/coredns/plugin"
    "github.com/miekg/dns"
)

type APILookup struct {
    Next      plugin.Handler
    APIEndpoint string
    Client    *http.Client
}

type APIResponse struct {
    IP  string `json:"ip"`
    TTL uint32 `json:"ttl"`
}

func (al *APILookup) ServeDNS(ctx context.Context, w dns.ResponseWriter, r *dns.Msg) (int, error) {
    // Only handle A record queries
    if len(r.Question) == 0 || r.Question[0].Qtype != dns.TypeA {
        return plugin.NextOrFailure(al.Name(), al.Next, ctx, w, r)
    }

    qname := r.Question[0].Name

    // Query external API
    apiResp, err := al.queryAPI(qname)
    if err != nil {
        // On error, pass to next plugin
        return plugin.NextOrFailure(al.Name(), al.Next, ctx, w, r)
    }

    // Create DNS response
    msg := new(dns.Msg)
    msg.SetReply(r)
    msg.Authoritative = true

    ip := net.ParseIP(apiResp.IP)
    if ip == nil {
        return dns.RcodeServerFailure, fmt.Errorf("invalid IP from API")
    }

    rr := &dns.A{
        Hdr: dns.RR_Header{
            Name:   qname,
            Rrtype: dns.TypeA,
            Class:  dns.ClassINET,
            Ttl:    apiResp.TTL,
        },
        A: ip,
    }
    msg.Answer = append(msg.Answer, rr)

    w.WriteMsg(msg)
    return dns.RcodeSuccess, nil
}

func (al *APILookup) queryAPI(name string) (*APIResponse, error) {
    url := fmt.Sprintf("%s?name=%s", al.APIEndpoint, name)

    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := al.Client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        return nil, fmt.Errorf("API returned status %d", resp.StatusCode)
    }

    var apiResp APIResponse
    if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
        return nil, err
    }

    return &apiResp, nil
}

func (al *APILookup) Name() string {
    return "apilookup"
}
```

## Building Custom CoreDNS with Plugin

Create `plugin.cfg` to include your plugin:

```
# Add your plugin to the list
customplugin:github.com/yourname/coredns-custom-plugin/customplugin
apilookup:github.com/yourname/coredns-custom-plugin/apilookup

# Standard plugins
kubernetes:kubernetes
prometheus:metrics
errors:errors
cache:cache
forward:forward
```

Build CoreDNS with custom plugin:

```bash
# Clone CoreDNS
git clone https://github.com/coredns/coredns.git
cd coredns

# Copy your plugin.cfg
cp ../plugin.cfg .

# Add your module to go.mod
go get github.com/yourname/coredns-custom-plugin@latest

# Build
make
```

## Testing Your Plugin Locally

Create test Corefile:

```
.:5353 {
    customplugin {
        option1 value1
        option2 value2
    }

    apilookup {
        endpoint http://localhost:8080/api/dns
    }

    forward . 8.8.8.8
    log
    errors
}
```

Run CoreDNS:

```bash
./coredns -conf Corefile -dns.port=5353
```

Test in another terminal:

```bash
dig @localhost -p 5353 test.example.com
dig @localhost -p 5353 api-lookup.example.com
```

## Deploying Custom CoreDNS to Kubernetes

Build and push Docker image:

```dockerfile
FROM golang:1.21 as builder

WORKDIR /app

# Copy CoreDNS with custom plugin
COPY coredns /app/
COPY plugin.cfg /app/

RUN make

FROM debian:bookworm-slim

COPY --from=builder /app/coredns /coredns

EXPOSE 53 53/udp

ENTRYPOINT ["/coredns"]
```

Build and push:

```bash
docker build -t your-registry/coredns-custom:latest .
docker push your-registry/coredns-custom:latest
```

Update CoreDNS deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: coredns
  namespace: kube-system
spec:
  replicas: 2
  selector:
    matchLabels:
      k8s-app: kube-dns
  template:
    metadata:
      labels:
        k8s-app: kube-dns
    spec:
      containers:
      - name: coredns
        image: your-registry/coredns-custom:latest
        args:
        - -conf
        - /etc/coredns/Corefile
        volumeMounts:
        - name: config-volume
          mountPath: /etc/coredns
          readOnly: true
        ports:
        - containerPort: 53
          name: dns
          protocol: UDP
        - containerPort: 53
          name: dns-tcp
          protocol: TCP
        - containerPort: 9153
          name: metrics
          protocol: TCP
      volumes:
      - name: config-volume
        configMap:
          name: coredns
```

## Adding Metrics to Your Plugin

Implement Prometheus metrics:

```go
package customplugin

import (
    "github.com/coredns/coredns/plugin"
    "github.com/prometheus/client_golang/prometheus"
)

var (
    requestCount = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Namespace: "coredns",
            Subsystem: "customplugin",
            Name:      "requests_total",
            Help:      "Total number of requests handled by customplugin",
        },
        []string{"status"},
    )

    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Namespace: "coredns",
            Subsystem: "customplugin",
            Name:      "request_duration_seconds",
            Help:      "Histogram of request duration",
            Buckets:   prometheus.DefBuckets,
        },
        []string{"status"},
    )
)

func init() {
    prometheus.MustRegister(requestCount)
    prometheus.MustRegister(requestDuration)
}

func (cp *CustomPlugin) ServeDNS(ctx context.Context, w dns.ResponseWriter, r *dns.Msg) (int, error) {
    start := time.Now()

    // ... your plugin logic ...

    duration := time.Since(start).Seconds()
    requestDuration.WithLabelValues("success").Observe(duration)
    requestCount.WithLabelValues("success").Inc()

    return dns.RcodeSuccess, nil
}
```

## Best Practices for Plugin Development

Follow these guidelines:

1. Handle errors gracefully - fallback to next plugin
2. Use context for timeouts and cancellation
3. Implement proper logging
4. Add Prometheus metrics for observability
5. Write unit tests for plugin logic
6. Document configuration options
7. Handle edge cases (empty queries, malformed requests)
8. Use caching when appropriate
9. Keep plugins focused and simple
10. Follow CoreDNS coding standards

Developing custom CoreDNS plugins extends DNS functionality to meet specialized requirements. By understanding the plugin API, implementing proper error handling, and following best practices, you can create reliable plugins that integrate seamlessly with CoreDNS and Kubernetes infrastructure.

For more CoreDNS customization, explore our guides on [CoreDNS configuration](https://oneuptime.com/blog/post/2026-02-09-coredns-custom-forward-zones/view) and [plugin chain debugging](https://oneuptime.com/blog/post/2026-02-09-debug-coredns-plugin-chain/view).
