# How to Use Dapr Kitex Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Kitex, RPC, Go

Description: Learn how to configure the Dapr Kitex output binding to call CloudWeGo Kitex RPC services from Dapr-enabled applications in a Go microservices environment.

---

## Overview of the Dapr Kitex Binding

Kitex is a high-performance Go RPC framework developed by ByteDance and open-sourced as part of the CloudWeGo project. The Dapr Kitex output binding enables Dapr applications to invoke Kitex services using Thrift binary generic calls without writing Kitex client code directly.

## Prerequisites

A running Kitex Thrift server accessible via a known host and port.

## Configure the Kitex Output Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kitex-service
spec:
  type: bindings.kitex
  version: v1
```

## Invoke a Kitex Service Method

```bash
curl -X POST http://localhost:3500/v1.0/bindings/kitex-service \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "get",
    "data": {
      "orderId": "order-001",
      "customerId": "cust-123"
    },
    "metadata": {
      "methodName": "GetOrder",
      "destService": "order.OrderService",
      "hostPorts": "127.0.0.1:8888",
      "version": "0.5.0"
    }
  }'
```

## Calling from Application Code

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

type BindingRequest struct {
    Operation string            `json:"operation"`
    Data      interface{}       `json:"data"`
    Metadata  map[string]string `json:"metadata"`
}

func callKitexService(method string, data interface{}) ([]byte, error) {
    req := BindingRequest{
        Operation: "get",
        Data:      data,
        Metadata: map[string]string{
            "methodName":  method,
            "destService": "order.OrderService",
            "hostPorts":   "127.0.0.1:8888",
            "version":     "0.5.0",
        },
    }

    body, _ := json.Marshal(req)
    resp, err := http.Post(
        "http://localhost:3500/v1.0/bindings/kitex-service",
        "application/json",
        bytes.NewReader(body),
    )
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    result, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }
    return result, nil
}

func main() {
    result, err := callKitexService("GetOrder", map[string]string{
        "orderId": "order-001",
    })
    if err != nil {
        panic(err)
    }
    fmt.Println("Result:", string(result))
}
```

## Required Request Metadata Fields

Every invocation request must include these four metadata fields:

- `methodName`: The RPC method to call on the Kitex server.
- `destService`: The destination Kitex service name.
- `hostPorts`: The host and port of the Kitex Thrift server (e.g., `"127.0.0.1:8888"`).
- `version`: The Kitex version (e.g., `"0.5.0"`).

## Summary

The Dapr Kitex output binding enables Dapr applications to call CloudWeGo Kitex RPC services without writing Kitex client code. Define the component in YAML, then invoke methods using the `get` operation by specifying the destination service, method name, host, and data payload in each request's metadata.
