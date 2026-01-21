# How to Use Redis for Service Discovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Service Discovery, Microservices, Health Checks, Load Balancing, Distributed Systems

Description: A comprehensive guide to implementing lightweight service discovery patterns with Redis for microservices architectures, including service registration, health checks, and load balancing.

---

Service discovery enables microservices to find and communicate with each other dynamically. Redis provides a lightweight alternative to dedicated service discovery tools like Consul or etcd for simpler deployments.

## Why Use Redis for Service Discovery?

Redis offers several advantages for service discovery:

- **Simplicity**: No additional infrastructure if already using Redis
- **Low latency**: Sub-millisecond lookups for service endpoints
- **Expiration**: Automatic cleanup of dead services with TTL
- **Pub/Sub**: Real-time notifications for service changes
- **Atomic operations**: Safe concurrent updates

## Basic Service Registry

Implement a simple service registry with Redis:

```python
import redis
import json
import time
import uuid
import socket
import threading
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)

@dataclass
class ServiceInstance:
    service_name: str
    instance_id: str
    host: str
    port: int
    metadata: Dict[str, Any]
    registered_at: float
    last_heartbeat: float

class ServiceRegistry:
    def __init__(self, redis_client: redis.Redis, ttl: int = 30):
        self.redis = redis_client
        self.ttl = ttl  # Time-to-live for service registration

    def _service_key(self, service_name: str) -> str:
        return f"services:{service_name}"

    def _instance_key(self, service_name: str, instance_id: str) -> str:
        return f"services:{service_name}:instances:{instance_id}"

    def register(self, service_name: str, host: str, port: int,
                 metadata: Optional[Dict[str, Any]] = None) -> str:
        """Register a service instance."""
        instance_id = str(uuid.uuid4())
        now = time.time()

        instance = ServiceInstance(
            service_name=service_name,
            instance_id=instance_id,
            host=host,
            port=port,
            metadata=metadata or {},
            registered_at=now,
            last_heartbeat=now
        )

        instance_key = self._instance_key(service_name, instance_id)
        service_key = self._service_key(service_name)

        pipe = self.redis.pipeline()

        # Store instance data with TTL
        pipe.setex(instance_key, self.ttl, json.dumps(asdict(instance)))

        # Add to service set
        pipe.sadd(service_key, instance_id)

        # Publish registration event
        pipe.publish(
            f"services:{service_name}:events",
            json.dumps({"event": "registered", "instance_id": instance_id})
        )

        pipe.execute()

        logger.info(f"Registered {service_name} instance: {instance_id}")
        return instance_id

    def deregister(self, service_name: str, instance_id: str):
        """Deregister a service instance."""
        instance_key = self._instance_key(service_name, instance_id)
        service_key = self._service_key(service_name)

        pipe = self.redis.pipeline()
        pipe.delete(instance_key)
        pipe.srem(service_key, instance_id)
        pipe.publish(
            f"services:{service_name}:events",
            json.dumps({"event": "deregistered", "instance_id": instance_id})
        )
        pipe.execute()

        logger.info(f"Deregistered {service_name} instance: {instance_id}")

    def heartbeat(self, service_name: str, instance_id: str) -> bool:
        """Send heartbeat to keep registration alive."""
        instance_key = self._instance_key(service_name, instance_id)

        # Get current data
        data = self.redis.get(instance_key)
        if not data:
            return False

        instance_data = json.loads(data)
        instance_data["last_heartbeat"] = time.time()

        # Update with new TTL
        self.redis.setex(instance_key, self.ttl, json.dumps(instance_data))

        return True

    def discover(self, service_name: str) -> List[ServiceInstance]:
        """Discover all instances of a service."""
        service_key = self._service_key(service_name)
        instance_ids = self.redis.smembers(service_key)

        instances = []
        stale_ids = []

        for instance_id in instance_ids:
            if isinstance(instance_id, bytes):
                instance_id = instance_id.decode()

            instance_key = self._instance_key(service_name, instance_id)
            data = self.redis.get(instance_key)

            if data:
                instance_data = json.loads(data)
                instances.append(ServiceInstance(**instance_data))
            else:
                # Instance expired, mark for cleanup
                stale_ids.append(instance_id)

        # Clean up stale entries
        if stale_ids:
            self.redis.srem(service_key, *stale_ids)

        return instances

    def get_instance(self, service_name: str,
                     instance_id: str) -> Optional[ServiceInstance]:
        """Get a specific service instance."""
        instance_key = self._instance_key(service_name, instance_id)
        data = self.redis.get(instance_key)

        if data:
            return ServiceInstance(**json.loads(data))
        return None
```

## Service Client with Auto-Registration

Create a client that handles registration and heartbeats:

```python
import redis
import threading
import time
import socket
import atexit
from typing import Dict, Any, Optional, Callable
import logging

logger = logging.getLogger(__name__)

class ServiceClient:
    def __init__(self, redis_client: redis.Redis, service_name: str,
                 port: int, metadata: Optional[Dict[str, Any]] = None):
        self.redis = redis_client
        self.registry = ServiceRegistry(redis_client)
        self.service_name = service_name
        self.port = port
        self.host = self._get_host()
        self.metadata = metadata or {}
        self.instance_id: Optional[str] = None
        self.heartbeat_interval = 10  # seconds
        self._heartbeat_thread: Optional[threading.Thread] = None
        self._running = False

        # Register cleanup on exit
        atexit.register(self.stop)

    def _get_host(self) -> str:
        """Get the host IP address."""
        hostname = socket.gethostname()
        return socket.gethostbyname(hostname)

    def start(self):
        """Start service registration and heartbeat."""
        self.instance_id = self.registry.register(
            self.service_name,
            self.host,
            self.port,
            self.metadata
        )

        self._running = True
        self._heartbeat_thread = threading.Thread(target=self._heartbeat_loop)
        self._heartbeat_thread.daemon = True
        self._heartbeat_thread.start()

        logger.info(f"Service client started: {self.service_name}:{self.instance_id}")

    def stop(self):
        """Stop service and deregister."""
        self._running = False

        if self._heartbeat_thread:
            self._heartbeat_thread.join(timeout=2)

        if self.instance_id:
            self.registry.deregister(self.service_name, self.instance_id)
            logger.info(f"Service client stopped: {self.service_name}")

    def _heartbeat_loop(self):
        """Background thread for sending heartbeats."""
        while self._running:
            try:
                success = self.registry.heartbeat(
                    self.service_name,
                    self.instance_id
                )
                if not success:
                    # Re-register if heartbeat fails
                    self.instance_id = self.registry.register(
                        self.service_name,
                        self.host,
                        self.port,
                        self.metadata
                    )
            except Exception as e:
                logger.error(f"Heartbeat failed: {e}")

            time.sleep(self.heartbeat_interval)

    def update_metadata(self, metadata: Dict[str, Any]):
        """Update service metadata."""
        self.metadata.update(metadata)
        # Re-register with new metadata
        if self.instance_id:
            self.registry.deregister(self.service_name, self.instance_id)
            self.instance_id = self.registry.register(
                self.service_name,
                self.host,
                self.port,
                self.metadata
            )

# Usage
def main():
    r = redis.Redis()

    # Start service
    client = ServiceClient(
        r,
        service_name="user-service",
        port=8080,
        metadata={"version": "1.0.0", "region": "us-east-1"}
    )
    client.start()

    try:
        # Run your service
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        client.stop()
```

## Load Balancer with Service Discovery

Implement client-side load balancing:

```python
import redis
import random
import time
from typing import List, Optional, Callable
from enum import Enum
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

class LoadBalanceStrategy(Enum):
    ROUND_ROBIN = "round_robin"
    RANDOM = "random"
    LEAST_CONNECTIONS = "least_connections"
    WEIGHTED = "weighted"

class ServiceLoadBalancer:
    def __init__(self, redis_client: redis.Redis, service_name: str,
                 strategy: LoadBalanceStrategy = LoadBalanceStrategy.ROUND_ROBIN):
        self.redis = redis_client
        self.registry = ServiceRegistry(redis_client)
        self.service_name = service_name
        self.strategy = strategy
        self._round_robin_index = 0
        self._connection_counts: Dict[str, int] = {}
        self._cache: List[ServiceInstance] = []
        self._cache_time = 0
        self._cache_ttl = 5  # Cache instances for 5 seconds

    def _refresh_cache(self):
        """Refresh the instances cache."""
        now = time.time()
        if now - self._cache_time > self._cache_ttl:
            self._cache = self.registry.discover(self.service_name)
            self._cache_time = now

    def get_instance(self) -> Optional[ServiceInstance]:
        """Get a service instance using the load balancing strategy."""
        self._refresh_cache()

        if not self._cache:
            return None

        if self.strategy == LoadBalanceStrategy.RANDOM:
            return random.choice(self._cache)

        elif self.strategy == LoadBalanceStrategy.ROUND_ROBIN:
            instance = self._cache[self._round_robin_index % len(self._cache)]
            self._round_robin_index += 1
            return instance

        elif self.strategy == LoadBalanceStrategy.LEAST_CONNECTIONS:
            # Get instance with least connections
            min_connections = float('inf')
            selected = self._cache[0]

            for instance in self._cache:
                connections = self._connection_counts.get(instance.instance_id, 0)
                if connections < min_connections:
                    min_connections = connections
                    selected = instance

            return selected

        elif self.strategy == LoadBalanceStrategy.WEIGHTED:
            # Use weight from metadata
            weights = []
            for instance in self._cache:
                weight = instance.metadata.get("weight", 1)
                weights.append(weight)

            return random.choices(self._cache, weights=weights)[0]

        return self._cache[0]

    def get_endpoint(self) -> Optional[str]:
        """Get service endpoint URL."""
        instance = self.get_instance()
        if instance:
            return f"http://{instance.host}:{instance.port}"
        return None

    def mark_connection_start(self, instance_id: str):
        """Mark connection started for least-connections balancing."""
        self._connection_counts[instance_id] = \
            self._connection_counts.get(instance_id, 0) + 1

    def mark_connection_end(self, instance_id: str):
        """Mark connection ended for least-connections balancing."""
        if instance_id in self._connection_counts:
            self._connection_counts[instance_id] = \
                max(0, self._connection_counts[instance_id] - 1)

# HTTP Client with Load Balancing
import requests
from contextlib import contextmanager

class DiscoveryHttpClient:
    def __init__(self, redis_client: redis.Redis, service_name: str,
                 strategy: LoadBalanceStrategy = LoadBalanceStrategy.ROUND_ROBIN):
        self.balancer = ServiceLoadBalancer(redis_client, service_name, strategy)
        self.timeout = 30

    @contextmanager
    def _with_instance(self):
        """Context manager for tracking connections."""
        instance = self.balancer.get_instance()
        if not instance:
            raise ServiceUnavailableError(f"No instances available")

        self.balancer.mark_connection_start(instance.instance_id)
        try:
            yield instance
        finally:
            self.balancer.mark_connection_end(instance.instance_id)

    def get(self, path: str, **kwargs) -> requests.Response:
        """Make GET request to service."""
        with self._with_instance() as instance:
            url = f"http://{instance.host}:{instance.port}{path}"
            return requests.get(url, timeout=self.timeout, **kwargs)

    def post(self, path: str, **kwargs) -> requests.Response:
        """Make POST request to service."""
        with self._with_instance() as instance:
            url = f"http://{instance.host}:{instance.port}{path}"
            return requests.post(url, timeout=self.timeout, **kwargs)

class ServiceUnavailableError(Exception):
    pass
```

## Health Checks

Add health check support to service discovery:

```python
import redis
import requests
import time
import threading
from typing import Dict, Any, List, Callable, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class HealthStatus(Enum):
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

class HealthChecker:
    def __init__(self, redis_client: redis.Redis,
                 check_interval: int = 10):
        self.redis = redis_client
        self.registry = ServiceRegistry(redis_client)
        self.check_interval = check_interval
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._custom_checks: Dict[str, Callable] = {}

    def register_check(self, service_name: str,
                       check_func: Callable[[ServiceInstance], bool]):
        """Register a custom health check for a service."""
        self._custom_checks[service_name] = check_func

    def _health_key(self, service_name: str, instance_id: str) -> str:
        return f"health:{service_name}:{instance_id}"

    def _default_http_check(self, instance: ServiceInstance) -> bool:
        """Default HTTP health check."""
        health_path = instance.metadata.get("health_path", "/health")
        url = f"http://{instance.host}:{instance.port}{health_path}"

        try:
            response = requests.get(url, timeout=5)
            return response.status_code == 200
        except Exception:
            return False

    def check_instance(self, instance: ServiceInstance) -> HealthStatus:
        """Check health of a single instance."""
        service_name = instance.service_name

        # Use custom check if available
        if service_name in self._custom_checks:
            check_func = self._custom_checks[service_name]
        else:
            check_func = self._default_http_check

        try:
            is_healthy = check_func(instance)
            status = HealthStatus.HEALTHY if is_healthy else HealthStatus.UNHEALTHY
        except Exception as e:
            logger.error(f"Health check error for {instance.instance_id}: {e}")
            status = HealthStatus.UNKNOWN

        # Store health status
        health_key = self._health_key(service_name, instance.instance_id)
        self.redis.setex(
            health_key,
            self.check_interval * 3,
            json.dumps({
                "status": status.value,
                "checked_at": time.time()
            })
        )

        return status

    def get_health(self, service_name: str,
                   instance_id: str) -> HealthStatus:
        """Get cached health status of an instance."""
        health_key = self._health_key(service_name, instance_id)
        data = self.redis.get(health_key)

        if data:
            health_data = json.loads(data)
            return HealthStatus(health_data["status"])

        return HealthStatus.UNKNOWN

    def get_healthy_instances(self, service_name: str) -> List[ServiceInstance]:
        """Get only healthy instances of a service."""
        instances = self.registry.discover(service_name)
        healthy = []

        for instance in instances:
            status = self.get_health(service_name, instance.instance_id)
            if status == HealthStatus.HEALTHY:
                healthy.append(instance)

        return healthy

    def start(self, services: List[str]):
        """Start background health checking."""
        self._running = True
        self._thread = threading.Thread(
            target=self._check_loop,
            args=(services,)
        )
        self._thread.daemon = True
        self._thread.start()

    def stop(self):
        """Stop health checking."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)

    def _check_loop(self, services: List[str]):
        """Background health check loop."""
        while self._running:
            for service_name in services:
                try:
                    instances = self.registry.discover(service_name)
                    for instance in instances:
                        status = self.check_instance(instance)
                        logger.debug(
                            f"Health check {service_name}:{instance.instance_id} "
                            f"- {status.value}"
                        )
                except Exception as e:
                    logger.error(f"Health check error for {service_name}: {e}")

            time.sleep(self.check_interval)

# Load balancer that only uses healthy instances
class HealthAwareLoadBalancer(ServiceLoadBalancer):
    def __init__(self, redis_client: redis.Redis, service_name: str,
                 health_checker: HealthChecker,
                 strategy: LoadBalanceStrategy = LoadBalanceStrategy.ROUND_ROBIN):
        super().__init__(redis_client, service_name, strategy)
        self.health_checker = health_checker

    def _refresh_cache(self):
        """Refresh cache with only healthy instances."""
        now = time.time()
        if now - self._cache_time > self._cache_ttl:
            self._cache = self.health_checker.get_healthy_instances(
                self.service_name
            )
            self._cache_time = now
```

## Service Events with Pub/Sub

Subscribe to service registration events:

```python
import redis
import json
import threading
from typing import Callable, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class ServiceEventListener:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.pubsub = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._handlers: Dict[str, Callable] = {}

    def subscribe(self, service_name: str,
                  handler: Callable[[Dict[str, Any]], None]):
        """Subscribe to events for a service."""
        self._handlers[service_name] = handler

    def start(self):
        """Start listening for events."""
        if not self._handlers:
            return

        self.pubsub = self.redis.pubsub()

        # Subscribe to all service channels
        channels = [
            f"services:{name}:events"
            for name in self._handlers.keys()
        ]
        self.pubsub.subscribe(*channels)

        self._running = True
        self._thread = threading.Thread(target=self._listen)
        self._thread.daemon = True
        self._thread.start()

    def stop(self):
        """Stop listening."""
        self._running = False
        if self.pubsub:
            self.pubsub.unsubscribe()
            self.pubsub.close()

    def _listen(self):
        """Background listening loop."""
        for message in self.pubsub.listen():
            if not self._running:
                break

            if message["type"] != "message":
                continue

            try:
                channel = message["channel"]
                if isinstance(channel, bytes):
                    channel = channel.decode()

                # Extract service name from channel
                parts = channel.split(":")
                if len(parts) >= 2:
                    service_name = parts[1]

                    if service_name in self._handlers:
                        data = json.loads(message["data"])
                        self._handlers[service_name](data)

            except Exception as e:
                logger.error(f"Error handling event: {e}")

# Usage
def on_user_service_event(event: Dict[str, Any]):
    print(f"User service event: {event}")

listener = ServiceEventListener(redis.Redis())
listener.subscribe("user-service", on_user_service_event)
listener.start()
```

## Service Mesh Pattern

Implement a simple service mesh with Redis:

```python
import redis
import json
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ServiceRoute:
    source: str
    destination: str
    weight: int = 100
    timeout: int = 30
    retry_count: int = 3

class ServiceMesh:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.registry = ServiceRegistry(redis_client)

    def _route_key(self, source: str, destination: str) -> str:
        return f"mesh:routes:{source}:{destination}"

    def configure_route(self, route: ServiceRoute):
        """Configure routing between services."""
        key = self._route_key(route.source, route.destination)
        self.redis.set(key, json.dumps({
            "source": route.source,
            "destination": route.destination,
            "weight": route.weight,
            "timeout": route.timeout,
            "retry_count": route.retry_count
        }))

    def get_route(self, source: str, destination: str) -> Optional[ServiceRoute]:
        """Get routing configuration."""
        key = self._route_key(source, destination)
        data = self.redis.get(key)

        if data:
            route_data = json.loads(data)
            return ServiceRoute(**route_data)

        # Return default route
        return ServiceRoute(source=source, destination=destination)

    def get_destination_instances(self, source: str,
                                   destination: str) -> List[ServiceInstance]:
        """Get destination instances with routing rules applied."""
        route = self.get_route(source, destination)
        instances = self.registry.discover(destination)

        # Apply weight-based filtering if needed
        if route and route.weight < 100:
            # Could implement canary routing here
            pass

        return instances

    def record_call(self, source: str, destination: str,
                    latency_ms: float, success: bool):
        """Record service call metrics."""
        key = f"mesh:metrics:{source}:{destination}"
        now = time.time()

        pipe = self.redis.pipeline()

        # Increment call count
        pipe.hincrby(key, "total_calls", 1)

        if success:
            pipe.hincrby(key, "success_calls", 1)
        else:
            pipe.hincrby(key, "error_calls", 1)

        # Record latency in sorted set for percentile calculation
        pipe.zadd(
            f"{key}:latencies",
            {f"{now}:{latency_ms}": now}
        )

        # Trim old latencies (keep last hour)
        pipe.zremrangebyscore(
            f"{key}:latencies",
            "-inf",
            now - 3600
        )

        pipe.execute()
```

## Best Practices

1. **Set appropriate TTLs** - Balance between quick failure detection and heartbeat overhead
2. **Implement retries** - Handle temporary failures gracefully
3. **Use health checks** - Only route to healthy instances
4. **Cache discoveries** - Avoid excessive Redis calls
5. **Handle network partitions** - Services should degrade gracefully
6. **Monitor registration counts** - Alert on unexpected changes
7. **Use consistent naming** - Establish service naming conventions

## Conclusion

Redis provides an excellent foundation for lightweight service discovery in microservices architectures. The combination of TTL-based registration, Pub/Sub for events, and atomic operations makes it suitable for dynamic service environments. For larger deployments, consider dedicated solutions like Consul or Kubernetes service discovery, but Redis works well for simpler setups or as a supplementary discovery mechanism.
