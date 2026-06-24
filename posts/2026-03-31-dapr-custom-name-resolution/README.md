# How to Use Custom Name Resolution in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Name Resolution, Custom Component, Plugin, Service Discovery

Description: Learn how to build and register a custom name resolution component in Dapr using the pluggable component SDK for specialized service discovery needs.

---

## When to Build a Custom Name Resolution Component

Dapr ships with built-in name resolution components for Kubernetes DNS, mDNS, Consul, SQLite, AWS CloudMap, and NameFormat. However, you may need a custom implementation for:

- Integration with proprietary service registries
- Custom load balancing or affinity logic
- Special routing based on metadata or request context
- A registry not supported by built-in components (e.g., Zookeeper, etcd)

Custom name resolution components are built by implementing the `Resolver` interface from `components-contrib` and compiling them into a custom Dapr runtime build.

## Implementing a Custom Name Resolution Component

Implement the `Resolver` interface from `github.com/dapr/components-contrib/nameresolution`. Using Go:

```go
package resolver

import (
    "context"
    "fmt"

    "github.com/dapr/components-contrib/nameresolution"
    "github.com/dapr/kit/logger"
)

type MyNameResolver struct {
    logger   logger.Logger
    registry map[string]string
}

func NewMyNameResolver(logger logger.Logger) nameresolution.Resolver {
    return &MyNameResolver{logger: logger}
}

func (r *MyNameResolver) Init(ctx context.Context, metadata nameresolution.Metadata) error {
    r.registry = map[string]string{
        "order-service":   "10.0.1.10:50001",
        "payment-service": "10.0.1.11:50001",
    }
    return nil
}

func (r *MyNameResolver) ResolveID(ctx context.Context, req nameresolution.ResolveRequest) (string, error) {
    addr, ok := r.registry[req.ID]
    if !ok {
        return "", fmt.Errorf("app ID %s not found", req.ID)
    }
    return addr, nil
}

func (r *MyNameResolver) Close() error {
    return nil
}
```

Register your component in a custom Dapr runtime build by adding it to the name resolution registry in a fork of the `dapr/dapr` repository.

## Configuring the Custom Component

Name resolution components are configured via a Dapr `Configuration` resource, not a `Component` resource:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "my-resolver"
    version: v1
    configuration:
      registryEndpoint: "etcd://etcd.internal:2379"
```

## Running the Custom Resolver with Dapr

After building a custom `daprd` binary with your resolver registered, run your application with the custom configuration:

```bash
dapr run --app-id myapp \
  --config ./appconfig.yaml \
  -- ./myapp
```

Dapr loads the name resolution component specified in the configuration at startup.

## Packaging in Kubernetes

In Kubernetes, deploy your custom `daprd` image that includes the resolver. Use annotations to reference the configuration:

```yaml
spec:
  containers:
    - name: app
      image: myapp:latest
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "myapp"
        dapr.io/config: "appconfig"
        dapr.io/sidecar-image: "myrepo/daprd-custom:latest"
```

## Testing the Custom Resolver

Invoke a service to verify the custom resolver is handling requests:

```bash
curl http://localhost:3500/v1.0/invoke/order-service/method/health
```

Check that the address returned by your resolver is the one being connected to:

```bash
dapr run --app-id myapp --log-level debug \
  --config ./appconfig.yaml -- ./myapp 2>&1 | grep -i resolve
```

## Summary

Custom Dapr name resolution components are implemented by fulfilling the `Resolver` interface from `components-contrib`. Register the resolver in a custom Dapr runtime build, configure it with a `Configuration` resource, and deploy a custom `daprd` image in Kubernetes. This approach enables integration with any service registry while preserving Dapr's standard service invocation API.
