# How to Build a gRPC Microservice in Python That Binds to IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: gRPC, Python, IPv4, Microservice, Networking, Kubernetes

Description: Learn how to build a production-ready gRPC microservice in Python that binds to an IPv4 address, with health checking, graceful shutdown, and Kubernetes deployment.

## Dependencies

```bash
pip install grpcio grpcio-tools grpcio-health-checking
```

## Generate Python Code from Proto

```bash
python -m grpc_tools.protoc -I./proto \
    --python_out=. --grpc_python_out=. \
    proto/hello.proto
```

## server.py

```python
import os
import signal
import logging
from concurrent import futures

import grpc
from grpc_health.v1 import health, health_pb2, health_pb2_grpc
import hello_pb2
import hello_pb2_grpc

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


class GreeterServicer(hello_pb2_grpc.GreeterServicer):
    def SayHello(self, request, context):
        log.info("SayHello called with name=%s from %s",
                 request.name, context.peer())
        return hello_pb2.HelloReply(message=f"Hello, {request.name}!")


def serve() -> None:
    addr = os.environ.get("GRPC_ADDR", "0.0.0.0:50051")

    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        options=[
            ("grpc.keepalive_time_ms",              30_000),
            ("grpc.keepalive_timeout_ms",           10_000),
            ("grpc.keepalive_permit_without_calls", True),
        ],
    )

    # Application servicer
    hello_pb2_grpc.add_GreeterServicer_to_server(GreeterServicer(), server)

    # Health servicer
    health_servicer = health.HealthServicer()
    health_pb2_grpc.add_HealthServicer_to_server(health_servicer, server)
    health_servicer.set("", health_pb2.HealthCheckResponse.SERVING)
    health_servicer.set("helloworld.Greeter",
                        health_pb2.HealthCheckResponse.SERVING)

    server.add_insecure_port(addr)
    server.start()
    log.info("gRPC server listening on %s", addr)

    def graceful_stop(signum, frame):
        log.info("Signal %d - shutting down", signum)
        health_servicer.set("", health_pb2.HealthCheckResponse.NOT_SERVING)
        health_servicer.set("helloworld.Greeter",
                            health_pb2.HealthCheckResponse.NOT_SERVING)
        server.stop(grace=10).wait()
        log.info("Server stopped")

    signal.signal(signal.SIGTERM, graceful_stop)
    signal.signal(signal.SIGINT,  graceful_stop)

    server.wait_for_termination()


if __name__ == "__main__":
    serve()
```

## Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN python -m pip install --no-cache-dir grpcio grpcio-health-checking
COPY . .
EXPOSE 50051
CMD ["python", "server.py"]
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: greeter-python
spec:
  replicas: 2
  selector:
    matchLabels:
      app: greeter-python
  template:
    metadata:
      labels:
        app: greeter-python
    spec:
      containers:
        - name: greeter
          image: myrepo/greeter-python:latest
          ports:
            - containerPort: 50051
          env:
            - name: GRPC_ADDR
              value: "0.0.0.0:50051"
          readinessProbe:
            grpc:
              port: 50051
              service: helloworld.Greeter
            initialDelaySeconds: 5
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["sleep", "5"]  # drain traffic before SIGTERM
```

## Conclusion

A Python gRPC microservice needs three things for production readiness: the application servicer, the standard health servicer (`grpcio-health-checking`), and signal handling for graceful shutdown. Set `NOT_SERVING` health status before calling `server.stop(grace=N)` so load balancers and Kubernetes stop routing traffic to the pod while in-flight RPCs finish. Configure keepalive options to detect dead connections. Use `GRPC_ADDR` environment variable injection for flexible deployment without image rebuilds.
