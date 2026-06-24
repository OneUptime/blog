# How to Develop Dapr Pluggable Name Resolution Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, Name Resolution, Service Discovery, gRPC

Description: Build a custom Dapr name resolution component to integrate with non-standard service registries using the pluggable component SDK.

---

## Dapr Name Resolution

Dapr uses name resolution components to discover the network address of services when handling service invocation calls. Built-in resolvers include Kubernetes (DNS-based), mDNS (local development), and Consul. A custom name resolver lets you integrate with service registries like Eureka, etcd, or an internal service catalog by implementing the Resolver interface in the components-contrib package.

## How Name Resolution Works

When Service A calls Service B via Dapr:
1. Service A calls Dapr sidecar: `POST /v1.0/invoke/service-b/method/endpoint`
2. Dapr calls the name resolver: "Where is service-b?"
3. The resolver returns an address (e.g., `10.0.1.42:3500`)
4. Dapr connects to Service B's sidecar at that address

## Project Setup

```bash
mkdir dapr-custom-resolver && cd dapr-custom-resolver
go mod init github.com/myorg/dapr-custom-resolver
go get github.com/dapr/components-contrib@latest
go get github.com/dapr/kit@latest
```

## Implementing the Name Resolver Interface

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "encoding/json"

    "github.com/dapr/components-contrib/nameresolution"
    "github.com/dapr/kit/logger"
)

var log = logger.NewLogger("catalog-resolver")

type ServiceCatalogResolver struct {
    catalogURL string
    httpClient *http.Client
}

type ServiceEntry struct {
    Host string `json:"host"`
    Port int    `json:"port"`
}

func (r *ServiceCatalogResolver) Init(ctx context.Context, metadata nameresolution.Metadata) error {
    if val, ok := metadata.Properties["catalogURL"]; ok {
        r.catalogURL = val
    }
    r.httpClient = &http.Client{}
    return nil
}

func (r *ServiceCatalogResolver) ResolveID(ctx context.Context, req nameresolution.ResolveRequest) (string, error) {
    // Look up the service in your registry
    url := fmt.Sprintf("%s/services/%s", r.catalogURL, req.ID)

    resp, err := r.httpClient.Get(url)
    if err != nil {
        return "", fmt.Errorf("failed to query catalog for %q: %w", req.ID, err)
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusNotFound {
        return "", fmt.Errorf("service %q not found in catalog", req.ID)
    }

    var entry ServiceEntry
    if err := json.NewDecoder(resp.Body).Decode(&entry); err != nil {
        return "", err
    }

    return fmt.Sprintf("%s:%d", entry.Host, entry.Port), nil
}

func (r *ServiceCatalogResolver) Close() error {
    return nil
}
```

## Registering the Component

Custom name resolvers are built-in components registered in the Dapr runtime. Create a factory function for your resolver:

```go
func NewServiceCatalogResolver(log logger.Logger) nameresolution.Resolver {
    return &ServiceCatalogResolver{}
}
```

Register the component in a custom Dapr runtime build by adding it to the name resolution component registry alongside the built-in resolvers (mDNS, Consul, Kubernetes DNS).

## Dapr Configuration

Name resolution components are configured through the Dapr Configuration resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "custom-catalog-resolver"
    version: v1
    configuration:
      catalogURL: "http://service-catalog.internal:8080"
```

## Testing the Name Resolver

```bash
# Run Dapr with the custom configuration
dapr run --app-id myapp --dapr-http-port 3500 --config ./appconfig.yaml -- go run .

# Test service invocation with custom resolver
curl http://localhost:3500/v1.0/invoke/payment-service/method/charge \
  -H "Content-Type: application/json" \
  -d '{"amount": 100, "currency": "USD"}'
```

## Caching Resolution Results

Add a simple cache to reduce registry load:

```go
type ServiceCatalogResolver struct {
    catalogURL string
    httpClient *http.Client
    cache      sync.Map
    cacheTTL   time.Duration
}

type cacheEntry struct {
    address   string
    expiresAt time.Time
}

func (r *ServiceCatalogResolver) ResolveID(ctx context.Context, req nameresolution.ResolveRequest) (string, error) {
    if entry, ok := r.cache.Load(req.ID); ok {
        ce := entry.(cacheEntry)
        if time.Now().Before(ce.expiresAt) {
            return ce.address, nil
        }
    }
    // ... fetch from catalog and cache result
}
```

## Summary

Custom Dapr name resolution components enable service discovery via custom registries by implementing the ResolveID method from the components-contrib Resolver interface. This is particularly valuable in organizations with existing service catalogs - Consul, Eureka, or proprietary registries - allowing Dapr's service invocation building block to work seamlessly without migrating to Kubernetes-native DNS.
