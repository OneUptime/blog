# How to Debug Custom Dapr Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Debug, Custom Component, Logging, gRPC

Description: Learn how to debug custom Dapr pluggable components using structured logging, gRPC interceptors, socket inspection, and Dapr sidecar diagnostics.

---

## Debugging Challenges with Pluggable Components

Custom Dapr components communicate with the sidecar via gRPC over Unix sockets, making traditional HTTP debugging tools insufficient. Effective debugging requires structured logging in the component, gRPC request interceptors, and familiarity with Dapr's sidecar diagnostic endpoints.

## Adding Structured Logging to Your Component

Use the Dapr logger interface for consistent log formatting:

```go
package store

import (
    "context"
    "time"

    proto "github.com/dapr/dapr/pkg/proto/components/v1"
    "github.com/dapr/kit/logger"
)

type DebugableStore struct {
    logger logger.Logger
    inner  proto.StateStoreServer
}

func (d *DebugableStore) Get(ctx context.Context, req *proto.GetRequest) (*proto.GetResponse, error) {
    start := time.Now()
    d.logger.Debugf("Get request: key=%s", req.Key)

    resp, err := d.inner.Get(ctx, req)

    elapsed := time.Since(start)
    if err != nil {
        d.logger.Errorf("Get failed: key=%s, elapsed=%v, error=%v", req.Key, elapsed, err)
    } else {
        d.logger.Debugf("Get success: key=%s, hasData=%v, elapsed=%v", req.Key, resp.Data != nil, elapsed)
    }

    return resp, err
}
```

## gRPC Interceptor for Request Tracing

Add a gRPC server interceptor to log all requests:

```go
import "google.golang.org/grpc"

func loggingInterceptor(logger logger.Logger) grpc.UnaryServerInterceptor {
    return func(
        ctx context.Context,
        req interface{},
        info *grpc.UnaryServerInfo,
        handler grpc.UnaryHandler,
    ) (interface{}, error) {
        logger.Debugf("gRPC call: method=%s", info.FullMethod)
        resp, err := handler(ctx, req)
        if err != nil {
            logger.Errorf("gRPC error: method=%s, error=%v", info.FullMethod, err)
        }
        return resp, err
    }
}

// Register with the gRPC server
srv := grpc.NewServer(
    grpc.UnaryInterceptor(loggingInterceptor(log)),
)
```

## Inspecting the Unix Socket

Verify the socket file exists and is connectable:

```bash
# Check socket file
ls -la /tmp/dapr-components-sockets/

# Test gRPC connectivity with grpc_cli
grpc_cli ls unix:/tmp/dapr-components-sockets/my-store.sock

# Use grpcurl with a Unix socket
grpcurl -plaintext -unix /tmp/dapr-components-sockets/my-store.sock list
```

## Dapr Sidecar Diagnostic Endpoints

Inspect component status via Dapr's diagnostic HTTP API:

```bash
# List all registered components
curl http://localhost:3500/v1.0/metadata | jq '.components'

# Check sidecar health
curl http://localhost:3500/v1.0/healthz

# Get sidecar configuration
curl http://localhost:3500/v1.0/metadata | jq '.appConnectionProperties'
```

## Enabling Verbose Dapr Logging

Run Dapr with debug log level to see component registration and gRPC calls:

```bash
dapr run \
  --app-id myapp \
  --log-level debug \
  --components-path ./components \
  -- python app.py 2>&1 | grep -E "(component|pluggable|grpc)"
```

In Kubernetes, patch the Dapr sidecar annotation:

```yaml
annotations:
  dapr.io/log-level: "debug"
  dapr.io/enable-profiling: "true"
```

## Summary

Debugging custom Dapr components requires combining structured logging inside the component, gRPC interceptors to trace every method call, Unix socket inspection tools like `grpcurl`, and Dapr's diagnostic API for component registration status. Enabling debug logging on the Dapr sidecar shows the full lifecycle from socket discovery through component initialization to runtime method invocations.
