# How to Configure gRPC Communication in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, gRPC, Communication, Service Invocation, Protocol

Description: Learn how to configure Dapr for gRPC-based service communication, enabling efficient binary protocol communication between microservices.

---

## Overview

Dapr supports gRPC as an application protocol alongside HTTP. When your application speaks gRPC, you configure Dapr to proxy gRPC calls between services, enabling binary protocol efficiency with Dapr's service discovery and mTLS benefits.

## Configuring the App for gRPC

Tell Dapr your application uses gRPC via annotations:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "grpc-service"
  dapr.io/app-port: "50051"
  dapr.io/app-protocol: "grpc"
```

Or via CLI for local development:

```bash
dapr run --app-id grpc-service \
  --app-port 50051 \
  --app-protocol grpc \
  -- go run main.go
```

## Implementing a gRPC Server

A simple gRPC server that handles Dapr invocation:

```go
package main

import (
    "context"
    "log"
    "net"

    commonv1 "github.com/dapr/dapr/pkg/proto/common/v1"
    pb "github.com/dapr/dapr/pkg/proto/runtime/v1"
    "google.golang.org/grpc"
    "google.golang.org/protobuf/types/known/anypb"
)

type server struct {
    pb.UnimplementedAppCallbackServer
}

func (s *server) OnInvoke(ctx context.Context, req *commonv1.InvokeRequest) (*commonv1.InvokeResponse, error) {
    log.Printf("Received invocation: method=%s", req.Method)
    return &commonv1.InvokeResponse{
        Data: &anypb.Any{Value: []byte(`{"status":"ok"}`)},
    }, nil
}

func main() {
    lis, _ := net.Listen("tcp", ":50051")
    s := grpc.NewServer()
    pb.RegisterAppCallbackServer(s, &server{})
    s.Serve(lis)
}
```

## Invoking a gRPC Service from Another Service

Use Dapr's HTTP API to invoke a gRPC service (Dapr translates HTTP to gRPC):

```bash
curl -X POST http://localhost:3500/v1.0/invoke/grpc-service/method/process \
  -H "Content-Type: application/json" \
  -d '{"input": "data"}'
```

Or use the Dapr Go gRPC client:

```go
import dapr "github.com/dapr/go-sdk/client"

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()

    resp, err := client.InvokeMethod(context.Background(),
        "grpc-service", "process", "post")
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Response: %s", string(resp))
}
```

## Enabling gRPC Proxying (Pass-through)

For native gRPC-to-gRPC communication, Dapr supports gRPC proxying. Since Dapr v1.7, gRPC proxying is stable and enabled by default — no additional configuration is needed.

For older Dapr versions (prior to v1.7), enable gRPC proxying in the Dapr Configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: grpcconfig
spec:
  features:
  - name: proxy.grpc
    enabled: true
```

Then connect directly via the Dapr gRPC port (50001) without HTTP translation.

## Configuring TLS for gRPC

Dapr automatically applies mTLS between sidecars. For app-to-sidecar TLS, configure:

```yaml
annotations:
  dapr.io/app-port: "50051"
  dapr.io/app-protocol: "grpcs"
```

## Summary

Dapr's gRPC support lets you keep the efficiency of binary protocols while gaining service discovery, mTLS, and observability for free. Configure the `app-protocol` annotation and implement the Dapr app callback interface to integrate existing gRPC services into the Dapr ecosystem.
