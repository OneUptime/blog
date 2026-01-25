# How to Build a Consul Service Discovery Client in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Consul, Service Discovery, Microservices, HashiCorp

Description: Learn how to build a production-ready Consul service discovery client in Go that handles service registration, health checks, and dynamic service lookup for microservices architectures.

---

Service discovery is the backbone of any microservices architecture. Without it, services have no way to find each other, and you end up hardcoding IP addresses like it is 2005. HashiCorp Consul solves this problem elegantly, and Go happens to be a perfect language for building clients that interact with it.

In this post, we will build a complete Consul service discovery client in Go. By the end, you will have reusable code that registers services, performs health checks, and discovers other services dynamically.

## Why Consul for Service Discovery

Consul offers more than just a key-value store. It provides:

- **Service registration and discovery** with health checking
- **DNS and HTTP interfaces** for flexible querying
- **Multi-datacenter support** out of the box
- **Built-in failure detection** that removes unhealthy instances automatically

The official Go client library makes integration straightforward. Let us start building.

## Setting Up the Project

First, initialize a new Go module and install the Consul API client:

```bash
mkdir consul-discovery && cd consul-discovery
go mod init consul-discovery
go get github.com/hashicorp/consul/api
```

## Building the Discovery Client

We will create a client struct that wraps the Consul API and provides clean methods for common operations.

```go
package discovery

import (
    "fmt"
    "log"
    "time"

    "github.com/hashicorp/consul/api"
)

// Client wraps the Consul API client with service discovery methods
type Client struct {
    consul    *api.Client
    serviceID string
}

// Config holds the configuration for our discovery client
type Config struct {
    ConsulAddress string
    ServiceName   string
    ServiceID     string
    ServicePort   int
    HealthPath    string
    Tags          []string
}

// NewClient creates a new Consul discovery client
func NewClient(cfg Config) (*Client, error) {
    // Configure the Consul client
    consulConfig := api.DefaultConfig()
    if cfg.ConsulAddress != "" {
        consulConfig.Address = cfg.ConsulAddress
    }

    // Create the client
    consul, err := api.NewClient(consulConfig)
    if err != nil {
        return nil, fmt.Errorf("failed to create consul client: %w", err)
    }

    return &Client{
        consul:    consul,
        serviceID: cfg.ServiceID,
    }, nil
}
```

This gives us a foundation. The `Config` struct keeps all settings in one place, making it easy to load from environment variables or config files.

## Registering a Service

When your service starts, it needs to announce itself to Consul. Here is how to handle registration with health checks:

```go
// Register adds the service to Consul with a health check
func (c *Client) Register(cfg Config) error {
    // Build the health check definition
    check := &api.AgentServiceCheck{
        HTTP:                           fmt.Sprintf("http://localhost:%d%s", cfg.ServicePort, cfg.HealthPath),
        Interval:                       "10s",
        Timeout:                        "5s",
        DeregisterCriticalServiceAfter: "30s",
    }

    // Build the service registration
    registration := &api.AgentServiceRegistration{
        ID:      cfg.ServiceID,
        Name:    cfg.ServiceName,
        Port:    cfg.ServicePort,
        Tags:    cfg.Tags,
        Check:   check,
    }

    // Register with the local agent
    err := c.consul.Agent().ServiceRegister(registration)
    if err != nil {
        return fmt.Errorf("failed to register service: %w", err)
    }

    log.Printf("Registered service %s with ID %s", cfg.ServiceName, cfg.ServiceID)
    return nil
}
```

The health check is critical. Consul will poll your `/health` endpoint (or whatever path you configure) every 10 seconds. If it fails for 30 seconds, Consul automatically deregisters the service. This keeps your service mesh clean and prevents traffic from routing to dead instances.

## Deregistering on Shutdown

When your service shuts down gracefully, it should tell Consul to remove it immediately rather than waiting for health checks to fail:

```go
// Deregister removes the service from Consul
func (c *Client) Deregister() error {
    err := c.consul.Agent().ServiceDeregister(c.serviceID)
    if err != nil {
        return fmt.Errorf("failed to deregister service: %w", err)
    }

    log.Printf("Deregistered service with ID %s", c.serviceID)
    return nil
}
```

Always wire this up to your shutdown signal handler. We will see how in the complete example below.

## Discovering Services

Now for the interesting part - finding other services. Here is a method that queries Consul and returns only healthy instances:

```go
// ServiceInstance represents a discovered service
type ServiceInstance struct {
    ID      string
    Address string
    Port    int
    Tags    []string
}

// Discover finds healthy instances of a service
func (c *Client) Discover(serviceName string) ([]ServiceInstance, error) {
    // Query for healthy services only
    services, _, err := c.consul.Health().Service(serviceName, "", true, nil)
    if err != nil {
        return nil, fmt.Errorf("failed to discover service %s: %w", serviceName, err)
    }

    instances := make([]ServiceInstance, 0, len(services))
    for _, entry := range services {
        // Use the service address if set, otherwise fall back to node address
        address := entry.Service.Address
        if address == "" {
            address = entry.Node.Address
        }

        instances = append(instances, ServiceInstance{
            ID:      entry.Service.ID,
            Address: address,
            Port:    entry.Service.Port,
            Tags:    entry.Service.Tags,
        })
    }

    return instances, nil
}
```

The third parameter to `Health().Service()` is `passingOnly`. Setting it to `true` filters out any instances that are failing health checks.

## Adding a Simple Load Balancer

In production, you will want to distribute requests across available instances. Here is a round-robin implementation:

```go
import (
    "sync/atomic"
)

// LoadBalancer provides round-robin selection across service instances
type LoadBalancer struct {
    client  *Client
    service string
    counter uint64
}

// NewLoadBalancer creates a load balancer for a specific service
func NewLoadBalancer(client *Client, serviceName string) *LoadBalancer {
    return &LoadBalancer{
        client:  client,
        service: serviceName,
    }
}

// Next returns the next healthy instance using round-robin selection
func (lb *LoadBalancer) Next() (*ServiceInstance, error) {
    instances, err := lb.client.Discover(lb.service)
    if err != nil {
        return nil, err
    }

    if len(instances) == 0 {
        return nil, fmt.Errorf("no healthy instances of %s available", lb.service)
    }

    // Atomic increment for thread safety
    idx := atomic.AddUint64(&lb.counter, 1) % uint64(len(instances))
    return &instances[idx], nil
}
```

This implementation queries Consul on every call, which works fine for low-traffic services. For high-throughput scenarios, consider caching the service list and using Consul's blocking queries to receive updates.

## Watching for Service Changes

For applications that need real-time updates when services come and go, Consul supports blocking queries. Here is a watcher implementation:

```go
// Watch monitors a service for changes and sends updates to the channel
func (c *Client) Watch(serviceName string, updates chan<- []ServiceInstance) {
    var lastIndex uint64

    for {
        // Use blocking query - this will wait until something changes
        opts := &api.QueryOptions{
            WaitIndex: lastIndex,
            WaitTime:  5 * time.Minute,
        }

        services, meta, err := c.consul.Health().Service(serviceName, "", true, opts)
        if err != nil {
            log.Printf("Watch error for %s: %v", serviceName, err)
            time.Sleep(5 * time.Second)
            continue
        }

        // Only send update if the index changed
        if meta.LastIndex != lastIndex {
            lastIndex = meta.LastIndex

            instances := make([]ServiceInstance, 0, len(services))
            for _, entry := range services {
                address := entry.Service.Address
                if address == "" {
                    address = entry.Node.Address
                }
                instances = append(instances, ServiceInstance{
                    ID:      entry.Service.ID,
                    Address: address,
                    Port:    entry.Service.Port,
                    Tags:    entry.Service.Tags,
                })
            }

            updates <- instances
        }
    }
}
```

The `WaitIndex` parameter tells Consul to hold the connection until the service list changes or the timeout expires. This is much more efficient than polling.

## Putting It All Together

Here is a complete example showing how to use the client in a real application:

```go
package main

import (
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"

    "consul-discovery/discovery"
)

func main() {
    // Configuration - in production, load from env or config file
    cfg := discovery.Config{
        ConsulAddress: "localhost:8500",
        ServiceName:   "api-service",
        ServiceID:     "api-service-1",
        ServicePort:   8080,
        HealthPath:    "/health",
        Tags:          []string{"api", "v1"},
    }

    // Create the discovery client
    client, err := discovery.NewClient(cfg)
    if err != nil {
        log.Fatalf("Failed to create discovery client: %v", err)
    }

    // Register with Consul
    if err := client.Register(cfg); err != nil {
        log.Fatalf("Failed to register service: %v", err)
    }

    // Set up graceful shutdown
    shutdown := make(chan os.Signal, 1)
    signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)

    // Start the health endpoint
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        w.Write([]byte("OK"))
    })

    go func() {
        log.Printf("Starting server on port %d", cfg.ServicePort)
        if err := http.ListenAndServe(":8080", nil); err != nil {
            log.Fatalf("Server failed: %v", err)
        }
    }()

    // Wait for shutdown signal
    <-shutdown
    log.Println("Shutting down...")

    // Deregister from Consul
    if err := client.Deregister(); err != nil {
        log.Printf("Failed to deregister: %v", err)
    }
}
```

## Production Considerations

Before deploying this to production, keep these points in mind:

**Connection pooling**: The Consul client handles this internally, but make sure you are reusing the same client instance across your application rather than creating new ones per request.

**Retry logic**: Network failures happen. Wrap your Consul calls with retry logic using exponential backoff.

**Caching**: For high-traffic services, cache the discovered instances locally and refresh them using the Watch pattern shown above.

**Health check design**: Your health endpoint should verify actual service readiness, not just return 200. Check database connections, cache availability, and any critical dependencies.

**Service IDs**: Use unique, deterministic IDs that include the hostname or pod name. This prevents conflicts when running multiple instances on the same machine.

## Wrapping Up

Building a Consul service discovery client in Go is straightforward once you understand the core concepts. The pattern we built here - register on startup, deregister on shutdown, discover and load balance - covers the vast majority of use cases.

The key insight is that service discovery is not just about finding services. It is about building resilient systems that adapt when services fail. The health check integration, automatic deregistration, and blocking queries all work together to keep your service mesh healthy without manual intervention.

Start with this foundation and extend it based on your specific needs. Add metrics collection, circuit breakers, or more sophisticated load balancing algorithms as your architecture demands.
