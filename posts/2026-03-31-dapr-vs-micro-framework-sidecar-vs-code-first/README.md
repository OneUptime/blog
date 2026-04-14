# Dapr vs Micro Framework: Sidecar vs Code-First Approaches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Micro, Framework, Microservice, Architecture

Description: Compare Dapr's sidecar model with code-first microservice frameworks like Micro to understand trade-offs in coupling, portability, and developer experience.

---

Dapr and code-first microservice frameworks like Micro (go-micro) represent two philosophies for building distributed services. Understanding the trade-offs helps you choose the right approach for your team and architecture.

## Two Philosophies

**Sidecar model (Dapr):** The infrastructure concerns live outside your application in a sidecar container. Your app calls localhost HTTP/gRPC APIs. The app itself has no dependency on Dapr's SDK (though SDKs exist for convenience).

**Code-first framework (Micro):** The distributed systems capabilities are embedded in your application via an SDK. The framework is imported as a library and wired directly into your service.

## A Service in Micro (Go)

```go
package main

import (
    "context"
    "go-micro.dev/v4"
    "go-micro.dev/v4/registry"
)

type OrderService struct{}

func (o *OrderService) PlaceOrder(ctx context.Context,
    req *pb.OrderRequest, rsp *pb.OrderResponse) error {
    // Business logic here
    rsp.Status = "accepted"
    return nil
}

func main() {
    svc := micro.NewService(
        micro.Name("order-service"),
        micro.Registry(registry.DefaultRegistry),
    )
    svc.Init()
    pb.RegisterOrderServiceHandler(svc.Server(), &OrderService{})
    svc.Run()
}
```

## The Same Service with Dapr

```go
package main

import (
    "net/http"
    "encoding/json"
)

// No Dapr import needed for simple HTTP handler
func placeOrder(w http.ResponseWriter, r *http.Request) {
    // Business logic here
    json.NewEncoder(w).Encode(map[string]string{"status": "accepted"})
}

func main() {
    http.HandleFunc("/PlaceOrder", placeOrder)
    http.ListenAndServe(":8080", nil)
}
```

The Dapr sidecar handles service discovery, routing, and observability without any code change.

## Trade-off: Coupling

Code-first frameworks couple your application to the framework. Replacing Micro requires changing your application code. With Dapr, you can run the same application without the sidecar (it just won't have Dapr's capabilities) and change components by editing YAML files.

## Trade-off: Developer Experience

Code-first frameworks often provide a richer development experience for the languages they support. Micro's Go SDK gives type-safe service calls and registration. Dapr's HTTP/gRPC interface is more universal but requires explicit API calls or an SDK.

```python
# Dapr SDK - explicit but portable
from dapr.clients import DaprClient
with DaprClient() as d:
    resp = d.invoke_method('order-service', 'PlaceOrder', data=b'{}')
```

## Trade-off: Operations

Dapr adds a sidecar container to every pod, increasing resource overhead. Code-first frameworks add library code but no additional containers. For very large clusters, the sidecar overhead is measurable.

## When to Choose Code-First Frameworks

- Single-language team where type safety matters
- Minimal infrastructure overhead is critical
- You want tight framework integration (e.g., Go-micro plugins)

## When to Choose Dapr

- Polyglot services needing a common infrastructure layer
- You want to swap components (Redis to Kafka) without code changes
- Your team already manages Kubernetes and wants cloud-native patterns

## Summary

Dapr's sidecar model provides infrastructure portability at the cost of an additional container per pod. Code-first frameworks like Micro embed distributed systems capabilities in your application for tighter integration and no sidecar overhead. Choose Dapr for polyglot, cloud-agnostic architectures and code-first frameworks when you have a single-language team that values type safety and minimal operational overhead.
