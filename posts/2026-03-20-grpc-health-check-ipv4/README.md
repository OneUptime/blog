# How to Configure gRPC Health Checking over IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Health Check, IPv4, Python, Go, Kubernetes

Description: Learn how to implement gRPC health checking using the standard grpc.health.v1 protocol in Python and Go, configure Kubernetes liveness/readiness probes, and use grpc_health_probe to test health...

## gRPC Health Protocol

The gRPC Health Checking Protocol defines a standard `Health` service:

```proto
service Health {
  rpc Check(HealthCheckRequest) returns (HealthCheckResponse);
  rpc List(HealthListRequest) returns (HealthListResponse);
  rpc Watch(HealthCheckRequest) returns (stream HealthCheckResponse);
}

enum ServingStatus {
  UNKNOWN = 0;
  SERVING = 1;
  NOT_SERVING = 2;
  SERVICE_UNKNOWN = 3; // Used only by the Watch method.
}
```

## Python: Adding Health Checking to a Server

```bash
pip install grpcio-health-checking
```

```python
import grpc
from concurrent import futures
from grpc_health.v1 import health, health_pb2, health_pb2_grpc

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # Create health servicer and add to server
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)

    # Mark the overall server as SERVING
    health_servicer.set(
        "", health_pb2.HealthCheckResponse.SERVING
    )
    # Mark a specific service
    health_servicer.set(
        "helloworld.Greeter",
        health_pb2.HealthCheckResponse.SERVING
    )

    server.add_insecure_port("0.0.0.0:50051")
    server.start()
    print("gRPC server with health check on 0.0.0.0:50051")
    server.wait_for_termination()

serve()
```

## Python: Health Check Client

```python
import grpc
from grpc_health.v1 import health_pb2, health_pb2_grpc

def check_health(address: str, service: str = "") -> str:
    with grpc.insecure_channel(address) as channel:
        stub = health_pb2_grpc.HealthStub(channel)
        try:
            response = stub.Check(
                health_pb2.HealthCheckRequest(service=service),
                timeout=3.0
            )
            return health_pb2.HealthCheckResponse.ServingStatus.Name(response.status)
        except grpc.RpcError as e:
            return f"ERROR: {e.code()}"

status = check_health("192.168.1.10:50051")
print(f"Server health: {status}")  # SERVING
```

## Go: Health Checking Server

```go
import (
    "google.golang.org/grpc"
    "google.golang.org/grpc/health"
    "google.golang.org/grpc/health/grpc_health_v1"
)

func main() {
    s := grpc.NewServer()

    // Register health service
    healthServer := health.NewServer()
    grpc_health_v1.RegisterHealthServer(s, healthServer)

    // Set status
    healthServer.SetServingStatus("", grpc_health_v1.HealthCheckResponse_SERVING)
    healthServer.SetServingStatus("helloworld.Greeter",
        grpc_health_v1.HealthCheckResponse_SERVING)

    // ...
}
```

## Kubernetes: gRPC Health Probe

```bash
# Install grpc_health_probe

wget https://github.com/grpc-ecosystem/grpc-health-probe/releases/latest/download/grpc_health_probe-linux-amd64
chmod +x grpc_health_probe-linux-amd64
mv grpc_health_probe-linux-amd64 /usr/local/bin/grpc_health_probe

# Test manually
grpc_health_probe -addr=192.168.1.10:50051
grpc_health_probe -addr=:50051 -service=helloworld.Greeter
```

```yaml
# Kubernetes probe configuration
livenessProbe:
  exec:
    command: ["/usr/local/bin/grpc_health_probe", "-addr=:50051"]
  initialDelaySeconds: 5
  periodSeconds: 10

readinessProbe:
  exec:
    command: ["/usr/local/bin/grpc_health_probe", "-addr=:50051", "-service=helloworld.Greeter"]
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Conclusion

Use the standard `grpc.health.v1.Health` service for gRPC health checking - it is supported by Kubernetes probes via `grpc_health_probe`, load balancers, and service meshes. Register the health servicer alongside your application servicers and update its serving status when your service starts and when it becomes unhealthy (e.g., DB connection lost). Mark the service `NOT_SERVING` during graceful shutdown to drain traffic before the pod terminates.
