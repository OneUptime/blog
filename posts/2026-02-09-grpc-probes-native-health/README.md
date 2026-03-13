# How to Configure gRPC Probes for Native gRPC Health Protocol Support

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, gRPC, Health Checks

Description: Implement Kubernetes gRPC health probes using the standard gRPC health checking protocol for microservices, enabling native health checks without HTTP endpoints or custom scripts.

---

Kubernetes 1.24 introduced native support for gRPC health checks. Instead of wrapping gRPC services with HTTP endpoints or using exec probes, you can now configure probes that speak the gRPC health checking protocol directly. This provides more accurate health status for gRPC-based microservices.

This guide shows you how to implement gRPC health checks in your services and configure Kubernetes to use them.

## Understanding gRPC Health Checking Protocol

The gRPC health checking protocol is defined in the `grpc.health.v1` package. Services implement a `Health` service with a `Check` RPC method that returns the serving status. Kubernetes can call this method to determine if your service is healthy.

The health check returns one of these statuses:
- `SERVING`: Service is healthy and ready
- `NOT_SERVING`: Service is unhealthy
- `UNKNOWN`: Health status cannot be determined

## Enabling gRPC Health Checks in Kubernetes

Configure a gRPC health probe:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: grpc-service
spec:
  containers:
  - name: app
    image: my-grpc-app:latest
    ports:
    - containerPort: 9090
      name: grpc

    livenessProbe:
      grpc:
        port: 9090
      initialDelaySeconds: 10
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3

    readinessProbe:
      grpc:
        port: 9090
        service: my.service.v1.MyService
      initialDelaySeconds: 5
      periodSeconds: 5
      timeoutSeconds: 3
      failureThreshold: 2
```

The `service` field is optional. If omitted, Kubernetes checks the overall server health. If specified, it checks the named service.

## Implementing gRPC Health Checks in Go

Add health checking to your Go gRPC server:

```go
package main

import (
    "context"
    "log"
    "net"

    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    "google.golang.org/grpc/health/grpc_health_v1"
    pb "your/package/proto"
)

type server struct {
    pb.UnimplementedMyServiceServer
}

func main() {
    lis, err := net.Listen("tcp", ":9090")
    if err != nil {
        log.Fatalf("failed to listen: %v", err)
    }

    // Create gRPC server
    s := grpc.NewServer()

    // Register your service
    myService := &server{}
    pb.RegisterMyServiceServer(s, myService)

    // Register health check service
    healthServer := health.NewServer()
    grpc_health_v1.RegisterHealthServer(s, healthServer)

    // Set service as serving
    healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)
    healthServer.SetServingStatus("my.service.v1.MyService", grpc_health_v1.HealthCheckResponse_SERVING)

    log.Println("gRPC server listening on :9090")
    if err := s.Serve(lis); err != nil {
        log.Fatalf("failed to serve: %v", err)
    }
}

// Update health status based on dependencies
func updateHealthStatus(healthServer *health.Server) {
    if checkDatabase() && checkCache() {
        healthServer.SetServingStatus("my.service.v1.MyService", grpc_health_v1.HealthCheckResponse_SERVING)
    } else {
        healthServer.SetServingStatus("my.service.v1.MyService", grpc_health_v1.HealthCheckResponse_NOT_SERVING)
    }
}
```

## Implementing gRPC Health Checks in Python

Use the grpcio-health-checking package:

```python
# server.py
import grpc
from concurrent import futures
import time

from grpc_health.v1 import health
from grpc_health.v1 import health_pb2
from grpc_health.v1 import health_pb2_grpc

import my_service_pb2
import my_service_pb2_grpc

class MyService(my_service_pb2_grpc.MyServiceServicer):
    def DoSomething(self, request, context):
        return my_service_pb2.Response(message="Hello")

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Add your service
    my_service_pb2_grpc.add_MyServiceServicer_to_server(MyService(), server)

    # Add health check service
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)

    # Set initial health status
    health_servicer.set(
        "my.service.v1.MyService",
        health_pb2.HealthCheckResponse.SERVING
    )
    health_servicer.set(
        "",  # Overall server health
        health_pb2.HealthCheckResponse.SERVING
    )

    server.add_insecure_port('[::]:9090')
    server.start()
    print("gRPC server started on port 9090")

    try:
        while True:
            # Update health status based on dependencies
            if check_dependencies():
                health_servicer.set(
                    "my.service.v1.MyService",
                    health_pb2.HealthCheckResponse.SERVING
                )
            else:
                health_servicer.set(
                    "my.service.v1.MyService",
                    health_pb2.HealthCheckResponse.NOT_SERVING
                )
            time.sleep(10)
    except KeyboardInterrupt:
        server.stop(0)

def check_dependencies():
    # Check database, cache, etc.
    return check_database() and check_redis()

if __name__ == '__main__':
    serve()
```

## Implementing gRPC Health Checks in Node.js

Use the @grpc/health-check package:

```javascript
// server.js
const grpc = require('@grpc/grpc-js');
const health = require('@grpc/health-check');
const protoLoader = require('@grpc/proto-loader');

// Load your service proto
const packageDefinition = protoLoader.loadSync('my_service.proto');
const myServiceProto = grpc.loadPackageDefinition(packageDefinition);

// Create health check service
const healthImpl = new health.Implementation({
  '': health.servingStatus.SERVING,
  'my.service.v1.MyService': health.servingStatus.SERVING,
});

function main() {
  const server = new grpc.Server();

  // Add your service
  server.addService(myServiceProto.MyService.service, {
    doSomething: (call, callback) => {
      callback(null, { message: 'Hello' });
    },
  });

  // Add health check service
  server.addService(health.service, healthImpl);

  server.bindAsync(
    '0.0.0.0:9090',
    grpc.ServerCredentials.createInsecure(),
    () => {
      console.log('gRPC server running on port 9090');
      server.start();
    }
  );

  // Update health status periodically
  setInterval(() => {
    if (checkDependencies()) {
      healthImpl.setStatus('my.service.v1.MyService', health.servingStatus.SERVING);
    } else {
      healthImpl.setStatus('my.service.v1.MyService', health.servingStatus.NOT_SERVING);
    }
  }, 10000);
}

function checkDependencies() {
  // Check database, cache, etc.
  return true;
}

main();
```

## Checking Specific Service Health

Configure probes to check individual services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grpc-gateway
spec:
  replicas: 3
  selector:
    matchLabels:
      app: grpc-gateway
  template:
    metadata:
      labels:
        app: grpc-gateway
    spec:
      containers:
      - name: gateway
        image: grpc-gateway:latest
        ports:
        - containerPort: 9090

        # Check overall server health
        livenessProbe:
          grpc:
            port: 9090
          periodSeconds: 10
          failureThreshold: 3

        # Check specific service readiness
        readinessProbe:
          grpc:
            port: 9090
            service: gateway.v1.Gateway
          periodSeconds: 5
          failureThreshold: 2

      - name: backend
        image: backend-service:latest
        ports:
        - containerPort: 9091

        livenessProbe:
          grpc:
            port: 9091
          periodSeconds: 10

        readinessProbe:
          grpc:
            port: 9091
            service: backend.v1.BackendService
          periodSeconds: 5
```

## Dynamic Health Status Updates

Update health status based on runtime conditions:

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "time"

    "google.golang.org/grpc/health"
    "google.golang.org/grpc/health/grpc_health_v1"
)

type HealthManager struct {
    healthServer *health.Server
    db           *sql.DB
    serviceName  string
}

func NewHealthManager(healthServer *health.Server, db *sql.DB, serviceName string) *HealthManager {
    return &HealthManager{
        healthServer: healthServer,
        db:           db,
        serviceName:  serviceName,
    }
}

func (hm *HealthManager) Start() {
    go hm.monitorHealth()
}

func (hm *HealthManager) monitorHealth() {
    ticker := time.NewTicker(5 * time.Second)
    defer ticker.Stop()

    for range ticker.C {
        if hm.checkHealth() {
            hm.healthServer.SetServingStatus(hm.serviceName, grpc_health_v1.HealthCheckResponse_SERVING)
            hm.healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)
        } else {
            hm.healthServer.SetServingStatus(hm.serviceName, grpc_health_v1.HealthCheckResponse_NOT_SERVING)
        }
    }
}

func (hm *HealthManager) checkHealth() bool {
    ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
    defer cancel()

    // Check database
    if err := hm.db.PingContext(ctx); err != nil {
        log.Printf("Database health check failed: %v", err)
        return false
    }

    // Check other dependencies
    if !hm.checkCache() {
        log.Printf("Cache health check failed")
        return false
    }

    return true
}

func (hm *HealthManager) checkCache() bool {
    // Implement cache check
    return true
}
```

## gRPC Health Checks with TLS

Configure probes for services using TLS:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-grpc-service
spec:
  containers:
  - name: app
    image: secure-grpc-app:latest
    ports:
    - containerPort: 9090
    volumeMounts:
    - name: tls-certs
      mountPath: /etc/tls
      readOnly: true

    livenessProbe:
      grpc:
        port: 9090
        # Kubernetes automatically handles TLS if service uses it
      periodSeconds: 10
      failureThreshold: 3

    readinessProbe:
      grpc:
        port: 9090
        service: my.service.v1.MyService
      periodSeconds: 5
      failureThreshold: 2

  volumes:
  - name: tls-certs
    secret:
      secretName: grpc-tls-cert
```

Kubernetes gRPC probes automatically detect and use TLS when the service requires it.

## Testing gRPC Health Checks

Test your health check implementation:

```bash
# Install grpc_health_probe
wget https://github.com/grpc-ecosystem/grpc-health-probe/releases/download/v0.4.19/grpc_health_probe-linux-amd64
chmod +x grpc_health_probe-linux-amd64

# Test health check
./grpc_health_probe-linux-amd64 -addr=localhost:9090

# Check specific service
./grpc_health_probe-linux-amd64 -addr=localhost:9090 -service=my.service.v1.MyService

# Test from within pod
kubectl exec -it my-pod -- grpc_health_probe -addr=localhost:9090
```

## Fallback to HTTP for Older Kubernetes

For clusters without native gRPC probe support:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: grpc-service-fallback
spec:
  containers:
  - name: app
    image: my-grpc-app:latest
    ports:
    - containerPort: 9090
      name: grpc
    - containerPort: 8080
      name: http

    # Use HTTP fallback endpoint
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8080
      periodSeconds: 10

    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      periodSeconds: 5
```

Implement an HTTP bridge in your service:

```go
func startHTTPHealthServer() {
    http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
        status := healthServer.GetServingStatus("")
        if status == grpc_health_v1.HealthCheckResponse_SERVING {
            w.WriteHeader(http.StatusOK)
            w.Write([]byte("OK"))
        } else {
            w.WriteHeader(http.StatusServiceUnavailable)
            w.Write([]byte("Not serving"))
        }
    })

    http.ListenAndServe(":8080", nil)
}
```

## Monitoring gRPC Health Checks

Track gRPC health check performance:

```promql
# gRPC probe success rate
sum by (namespace, pod) (
  rate(prober_probe_total{probe_type="GRPC",result="success"}[5m])
) / sum by (namespace, pod) (
  rate(prober_probe_total{probe_type="GRPC"}[5m])
)

# gRPC probe latency
histogram_quantile(0.95,
  rate(prober_probe_duration_seconds_bucket{probe_type="GRPC"}[5m])
)
```

## Debugging gRPC Health Check Issues

Troubleshoot gRPC probe failures:

```bash
# Check if gRPC server is listening
kubectl exec -it my-pod -- netstat -tlnp | grep 9090

# Test health check manually
kubectl exec -it my-pod -- grpc_health_probe -addr=localhost:9090 -v

# Check health status of specific service
kubectl exec -it my-pod -- grpc_health_probe -addr=localhost:9090 \
  -service=my.service.v1.MyService -v

# View pod events
kubectl describe pod my-pod

# Check server logs
kubectl logs my-pod
```

## Best Practices

Follow these guidelines:

```yaml
# DO: Use for gRPC services
livenessProbe:
  grpc:
    port: 9090

# DO: Check specific services for readiness
readinessProbe:
  grpc:
    port: 9090
    service: my.service.v1.MyService

# DO: Implement health status updates
# Update based on dependencies

# DON'T: Forget to register health service
# Must implement grpc.health.v1.Health

# DO: Use reasonable timeouts
livenessProbe:
  grpc:
    port: 9090
  timeoutSeconds: 5
  periodSeconds: 10
```

## Conclusion

Native gRPC health probes provide accurate, efficient health checking for gRPC services without the overhead of HTTP bridges or exec probes. By implementing the standard gRPC health checking protocol in your services, you enable Kubernetes to natively understand your service's health status.

Implement the health service in your gRPC servers, configure probes to check overall server health or specific services, and update health status dynamically based on your dependencies. This approach provides the most accurate health checking for gRPC-based microservices.
