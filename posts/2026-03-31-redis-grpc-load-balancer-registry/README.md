# How to Build a gRPC Load Balancer Registry with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, gRPC, Service Discovery

Description: Learn how to build a simple gRPC service registry using Redis so clients can discover and load balance across backend instances without a full service mesh.

---

gRPC clients need to know the addresses of available service instances. Rather than hardcoding addresses or relying on DNS, you can build a lightweight service registry with Redis. Instances register themselves on startup and heartbeat their address, and clients query Redis to build a list of live endpoints.

## Service Registration on Startup

Each gRPC service instance writes its address to Redis with a TTL. If the instance dies without deregistering, the key expires automatically.

```python
import redis
import socket
import os
import threading
import time
import grpc

r = redis.Redis.from_url(os.environ['REDIS_URL'])

SERVICE_NAME = 'product-service'
PORT = 50051
TTL = 30  # seconds

def get_instance_id():
    return f"{socket.gethostname()}:{PORT}"

def register():
    instance_id = get_instance_id()
    key = f"grpc:registry:{SERVICE_NAME}:{instance_id}"
    r.setex(key, TTL, f"{socket.gethostbyname(socket.gethostname())}:{PORT}")
    print(f"Registered {key}")

def heartbeat():
    while True:
        register()
        time.sleep(TTL // 2)

# Start heartbeat in background
thread = threading.Thread(target=heartbeat, daemon=True)
thread.start()
```

## Discovering Live Instances

```python
def discover_instances(service_name):
    pattern = f"grpc:registry:{service_name}:*"
    keys = r.keys(pattern)
    instances = []
    for key in keys:
        addr = r.get(key)
        if addr:
            instances.append(addr.decode())
    return instances
```

## Client-Side Load Balancing

```python
import grpc
import random
import product_pb2
import product_pb2_grpc

def get_stub(service_name):
    instances = discover_instances(service_name)
    if not instances:
        raise RuntimeError(f"No instances found for {service_name}")

    # Simple round-robin or random selection
    address = random.choice(instances)
    channel = grpc.insecure_channel(address)
    return product_pb2_grpc.ProductServiceStub(channel)

stub = get_stub('product-service')
response = stub.GetProduct(product_pb2.GetProductRequest(id='123'))
```

## Deregistration at Shutdown

```python
import signal

def deregister():
    instance_id = get_instance_id()
    key = f"grpc:registry:{SERVICE_NAME}:{instance_id}"
    r.delete(key)
    print(f"Deregistered {key}")

signal.signal(signal.SIGTERM, lambda sig, frame: (deregister(), exit(0)))
signal.signal(signal.SIGINT, lambda sig, frame: (deregister(), exit(0)))
```

## Viewing the Registry

```bash
redis-cli keys "grpc:registry:*"
redis-cli get "grpc:registry:product-service:hostname:50051"
redis-cli ttl "grpc:registry:product-service:hostname:50051"
```

## Health Check Integration

Combine the registry with a gRPC health check - only register if the service passes its own health check:

```python
from grpc_health.v1 import health_pb2_grpc, health_pb2

def is_healthy(address):
    channel = grpc.insecure_channel(address)
    stub = health_pb2_grpc.HealthStub(channel)
    try:
        response = stub.Check(health_pb2.HealthCheckRequest(service=SERVICE_NAME))
        return response.status == health_pb2.HealthCheckResponse.SERVING
    except:
        return False
```

## Summary

A Redis-based gRPC service registry uses key TTLs to automatically remove dead instances without manual deregistration. Services heartbeat their addresses and clients scan the registry pattern to build a live instance list for load balancing. This approach is simple to implement and works well for smaller deployments where a full service mesh like Istio or Consul is unnecessary.
