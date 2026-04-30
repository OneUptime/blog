# How to Configure gRPC Health Checks over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, IPv6, Health Check, Kubernetes, Monitoring

Description: Implement the standard gRPC health check protocol over IPv6 for Kubernetes liveness probes, load balancers, and monitoring systems.

## The gRPC Health Check Protocol

The gRPC Health Check Protocol (grpc.health.v1) provides a standard way to check service health. Kubernetes, Envoy, and monitoring tools all understand this protocol.

## Step 1: Add Health Check in Go

```go
// main.go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    "google.golang.org/grpc/health/grpc_health_v1"
    "net"
)

func main() {
    // Listen on IPv6
    lis, err := net.Listen("tcp", "[::]:50051")
    if err != nil {
        panic(err)
    }

    server := grpc.NewServer()

    // Register your service
    pb.RegisterGreeterServer(server, &greeterServer{})

    // Register health check service
    healthServer := health.NewServer()
    grpc_health_v1.RegisterHealthServer(server, healthServer)

    // Set initial health status
    healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)
    healthServer.SetServingStatus("helloworld.Greeter", grpc_health_v1.HealthCheckResponse_SERVING)

    server.Serve(lis)
}
```

## Step 2: Health Check in Python

```python
# server_with_health.py

import grpc
from concurrent import futures
from grpc_health.v1 import health
from grpc_health.v1 import health_pb2
from grpc_health.v1 import health_pb2_grpc

server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

# Add health servicer
health_servicer = health.HealthServicer()
health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)

# Set health status
health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)
health_servicer.set("helloworld.Greeter", health_pb2.HealthCheckResponse.SERVING)

# Bind on IPv6
server.add_insecure_port("[::]:50051")
server.start()
server.wait_for_termination()
```

## Step 3: Kubernetes Probe Configuration

```yaml
# deployment.yaml - use gRPC health check over IPv6
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-service
spec:
  template:
    spec:
      containers:
        - name: grpc-server
          image: my-grpc-server:latest
          ports:
            - containerPort: 50051
              protocol: TCP
          livenessProbe:
            grpc:
              # Native gRPC probes are beta in Kubernetes 1.24-1.26 and stable in 1.27+
              port: 50051
              service: "helloworld.Greeter"
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            grpc:
              port: 50051
              service: "helloworld.Greeter"
            initialDelaySeconds: 5
            periodSeconds: 5
```

## Step 4: Testing Health Check over IPv6

```bash
# Install grpc-health-probe
wget -O /usr/local/bin/grpc_health_probe \
  https://github.com/grpc-ecosystem/grpc-health-probe/releases/latest/download/grpc_health_probe-linux-amd64
chmod +x /usr/local/bin/grpc_health_probe

# Check health over IPv6 loopback
grpc_health_probe -addr '[::1]:50051'

# Check health of specific service
grpc_health_probe -addr '[2001:db8::1]:50051' -service 'helloworld.Greeter'

# With timeout
grpc_health_probe -addr '[2001:db8::1]:50051' -connect-timeout 5s -rpc-timeout 5s

# Using grpcurl (requires server reflection, or supply descriptors with -proto/-protoset)
grpcurl -plaintext -d '{"service":"helloworld.Greeter"}' '[2001:db8::1]:50051' grpc.health.v1.Health/Check
```

## Step 5: Dynamic Health Status Updates

```go
// Update health status based on dependencies
func checkDependencies(healthServer *health.Server) {
    // Check database connectivity
    if isDatabaseHealthy() {
        healthServer.SetServingStatus(
            "helloworld.Greeter",
            grpc_health_v1.HealthCheckResponse_SERVING,
        )
    } else {
        healthServer.SetServingStatus(
            "helloworld.Greeter",
            grpc_health_v1.HealthCheckResponse_NOT_SERVING,
        )
    }
}

// Run health checks periodically
go func() {
    ticker := time.NewTicker(30 * time.Second)
    for range ticker.C {
        checkDependencies(healthServer)
    }
}()
```

## Step 6: Watch Protocol for Real-Time Health

```go
// Client watching health changes (useful for load balancers)
func watchHealth(addr string) {
    conn, _ := grpc.NewClient(
        addr,  // e.g., "[2001:db8::1]:50051"
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )

    client := grpc_health_v1.NewHealthClient(conn)
    ctx := context.Background()

    stream, err := client.Watch(ctx, &grpc_health_v1.HealthCheckRequest{
        Service: "helloworld.Greeter",
    })
    if err != nil {
        log.Fatal(err)
    }

    for {
        resp, err := stream.Recv()
        if err != nil {
            break
        }
        log.Printf("Health status: %v", resp.Status)
    }
}
```

## Monitoring with OneUptime

Use [OneUptime](https://oneuptime.com) with Port monitors to check gRPC endpoints over IPv6. The port check verifies TCP port availability; combine it with a Custom Code monitor that runs `grpc_health_probe` for full gRPC health protocol testing.

## Conclusion

gRPC health checks over IPv6 usually expose the health service on the same IPv6 listener as your main service. Use `grpc_health_probe` or `grpcurl` for testing, Kubernetes native gRPC probes for container health, and the Watch RPC for real-time health monitoring.
