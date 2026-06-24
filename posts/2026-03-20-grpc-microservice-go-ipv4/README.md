# How to Build a gRPC Microservice in Go That Binds to IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Go, IPv4, Microservice, Networking, Kubernetes

Description: Learn how to build a production-ready gRPC microservice in Go that binds to an IPv4 address, with health checking, graceful shutdown, metrics, and Kubernetes deployment configuration.

## Project Structure

```text
greeter/
├── go.mod
├── go.sum
├── proto/hello.proto
├── main.go
├── Dockerfile
└── k8s/deployment.yaml
```

## Proto Definition

```proto
// proto/hello.proto
syntax = "proto3";
package helloworld;
option go_package = "example.com/greeter/hello";

service Greeter {
  rpc SayHello (HelloRequest) returns (HelloReply);
}

message HelloRequest { string name = 1; }
message HelloReply   { string message = 1; }
```

## main.go

```go
package main

import (
    "context"
    "fmt"
    "log"
    "net"
    "os"
    "os/signal"
    "syscall"
    "time"

    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    "google.golang.org/grpc/health/grpc_health_v1"
    "google.golang.org/grpc/reflection"
    pb "example.com/greeter/hello"
)

type greeterServer struct{ pb.UnimplementedGreeterServer }

func (s *greeterServer) SayHello(_ context.Context, req *pb.HelloRequest) (*pb.HelloReply, error) {
    return &pb.HelloReply{Message: fmt.Sprintf("Hello, %s!", req.GetName())}, nil
}

func main() {
    addr := os.Getenv("GRPC_ADDR")
    if addr == "" {
        addr = "0.0.0.0:50051"
    }

    lis, err := net.Listen("tcp4", addr)
    if err != nil {
        log.Fatalf("listen on %s: %v", addr, err)
    }

    s := grpc.NewServer()

    // Application service
    pb.RegisterGreeterServer(s, &greeterServer{})

    // Health checking
    hs := health.NewServer()
    grpc_health_v1.RegisterHealthServer(s, hs)
    hs.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)
    hs.SetServingStatus("helloworld.Greeter", grpc_health_v1.HealthCheckResponse_SERVING)

    // Reflection (for grpcurl)
    reflection.Register(s)

    // Graceful shutdown
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)
    go func() {
        <-stop
        log.Println("shutting down...")
        hs.Shutdown()

        done := make(chan struct{})
        go func() {
            s.GracefulStop()
            close(done)
        }()

        select {
        case <-done:
        case <-time.After(10 * time.Second):
            log.Println("forcing shutdown")
            s.Stop()
        }
    }()

    log.Printf("gRPC server on %s", addr)
    if err := s.Serve(lis); err != nil {
        log.Fatalf("serve: %v", err)
    }
}
```

## Dockerfile

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /greeter .

FROM gcr.io/distroless/static-debian12
COPY --from=builder /greeter /greeter
EXPOSE 50051
ENTRYPOINT ["/greeter"]
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: greeter
spec:
  replicas: 3
  selector:
    matchLabels:
      app: greeter
  template:
    metadata:
      labels:
        app: greeter
    spec:
      containers:
        - name: greeter
          image: myrepo/greeter:latest
          ports:
            - containerPort: 50051
          env:
            - name: GRPC_ADDR
              value: "0.0.0.0:50051"
          readinessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            grpc:
              port: 50051
            initialDelaySeconds: 10
            periodSeconds: 15
```

## Conclusion

A gRPC microservice in Go registers the application servicer, the standard health service, and gRPC reflection. Use `net.Listen("tcp4", addr)` to explicitly restrict the listener to IPv4. On shutdown, call `hs.Shutdown()` before `GracefulStop`, and pair `GracefulStop` with a timeout-backed `Stop` fallback so in-flight RPCs can drain without blocking indefinitely. Configure Kubernetes readiness and liveness probes using native gRPC probes to integrate with the cluster's health checking infrastructure.
