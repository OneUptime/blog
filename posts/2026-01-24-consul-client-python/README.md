# How to Build a Consul Client in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Consul, Service Discovery, Configuration Management, Microservices, Distributed Systems

Description: Learn how to build a Consul client in Python for service discovery, configuration management, and health checks. This guide covers practical implementations with async support and production patterns.

---

> Consul is the backbone of service discovery in many distributed systems. Building a proper client in Python means understanding not just the API, but also how to handle failures gracefully and keep your services connected.

Service discovery becomes essential when you move from a monolith to microservices. Instead of hardcoding service addresses, you register services with Consul and let it handle the routing. This guide shows you how to build a Python client that does this reliably.

---

## Understanding Consul

Consul provides several key features:

| Feature | Description | Use Case |
|---------|-------------|----------|
| **Service Discovery** | Find healthy service instances | Load balancing |
| **Key-Value Store** | Distributed configuration | Feature flags, secrets |
| **Health Checks** | Monitor service health | Auto-deregistration |
| **Service Mesh** | Secure service communication | mTLS, authorization |

---

## Basic Consul Client

This client wraps the Consul HTTP API and provides Python-friendly methods for common operations.

```python
# consul_client.py
# Python client for HashiCorp Consul
import httpx
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import json

class HealthStatus(Enum):
    """Consul health check statuses"""
    PASSING = "passing"
    WARNING = "warning"
    CRITICAL = "critical"

@dataclass
class ServiceInstance:
    """Represents a registered service instance"""
    id: str  # Unique instance ID
    name: str  # Service name
    address: str  # Host address
    port: int  # Service port
    tags: List[str]  # Service tags for filtering
    meta: Dict[str, str]  # Metadata key-value pairs
    health: HealthStatus  # Current health status

@dataclass
class ConsulConfig:
    """Configuration for Consul client"""
    host: str = "localhost"
    port: int = 8500
    scheme: str = "http"
    token: Optional[str] = None  # ACL token for authentication
    datacenter: Optional[str] = None  # Target datacenter

    @property
    def base_url(self) -> str:
        """Build the base URL for Consul API"""
        return f"{self.scheme}://{self.host}:{self.port}"

class ConsulClient:
    """
    Synchronous Consul client for service discovery and KV operations.

    Example:
        client = ConsulClient(ConsulConfig())
        client.register_service("web-api", "10.0.0.1", 8080)
        instances = client.get_service("web-api")
    """

    def __init__(self, config: ConsulConfig):
        self.config = config
        self._client = httpx.Client(
            base_url=config.base_url,
            timeout=10.0  # Reasonable timeout for Consul operations
        )

        # Build default headers
        self._headers = {"Content-Type": "application/json"}
        if config.token:
            self._headers["X-Consul-Token"] = config.token

    def _build_params(self, **kwargs) -> Dict[str, Any]:
        """Build query parameters with datacenter if configured"""
        params = {k: v for k, v in kwargs.items() if v is not None}
        if self.config.datacenter:
            params["dc"] = self.config.datacenter
        return params

    # ---------------------------
    # Service Registration
    # ---------------------------

    def register_service(
        self,
        name: str,
        address: str,
        port: int,
        service_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        meta: Optional[Dict[str, str]] = None,
        check_http: Optional[str] = None,
        check_interval: str = "10s"
    ) -> bool:
        """
        Register a service with Consul.

        Args:
            name: Service name (e.g., "web-api")
            address: Host address where service is running
            port: Port number for the service
            service_id: Unique ID for this instance (defaults to name)
            tags: List of tags for filtering (e.g., ["v1", "primary"])
            meta: Metadata key-value pairs
            check_http: HTTP endpoint for health checks
            check_interval: How often to run health check

        Returns:
            True if registration succeeded
        """
        # Build service registration payload
        service_def = {
            "ID": service_id or f"{name}-{address}-{port}",
            "Name": name,
            "Address": address,
            "Port": port,
            "Tags": tags or [],
            "Meta": meta or {}
        }

        # Add HTTP health check if specified
        if check_http:
            service_def["Check"] = {
                "HTTP": check_http,
                "Interval": check_interval,
                "Timeout": "5s",  # Health check timeout
                "DeregisterCriticalServiceAfter": "1m"  # Auto-deregister if unhealthy
            }

        # Send registration request
        response = self._client.put(
            "/v1/agent/service/register",
            headers=self._headers,
            json=service_def
        )

        return response.status_code == 200

    def deregister_service(self, service_id: str) -> bool:
        """
        Deregister a service from Consul.

        Args:
            service_id: The service ID to deregister

        Returns:
            True if deregistration succeeded
        """
        response = self._client.put(
            f"/v1/agent/service/deregister/{service_id}",
            headers=self._headers
        )
        return response.status_code == 200

    # ---------------------------
    # Service Discovery
    # ---------------------------

    def get_service(
        self,
        name: str,
        tag: Optional[str] = None,
        passing_only: bool = True
    ) -> List[ServiceInstance]:
        """
        Get healthy instances of a service.

        Args:
            name: Service name to look up
            tag: Filter by specific tag
            passing_only: Only return healthy instances

        Returns:
            List of ServiceInstance objects
        """
        # Build query parameters
        params = self._build_params(
            tag=tag,
            passing="true" if passing_only else None
        )

        # Query the health endpoint for full instance details
        response = self._client.get(
            f"/v1/health/service/{name}",
            headers=self._headers,
            params=params
        )

        if response.status_code != 200:
            return []

        # Parse response into ServiceInstance objects
        instances = []
        for entry in response.json():
            service = entry["Service"]
            checks = entry["Checks"]

            # Determine overall health from all checks
            health = self._aggregate_health(checks)

            instances.append(ServiceInstance(
                id=service["ID"],
                name=service["Service"],
                address=service["Address"],
                port=service["Port"],
                tags=service.get("Tags", []),
                meta=service.get("Meta", {}),
                health=health
            ))

        return instances

    def _aggregate_health(self, checks: List[Dict]) -> HealthStatus:
        """Determine overall health from multiple checks"""
        statuses = [check["Status"] for check in checks]

        if "critical" in statuses:
            return HealthStatus.CRITICAL
        elif "warning" in statuses:
            return HealthStatus.WARNING
        else:
            return HealthStatus.PASSING

    def get_service_address(self, name: str) -> Optional[str]:
        """
        Get a single healthy service address (for simple use cases).

        Args:
            name: Service name

        Returns:
            Address string like "10.0.0.1:8080" or None
        """
        instances = self.get_service(name, passing_only=True)
        if not instances:
            return None

        # Return first healthy instance
        instance = instances[0]
        return f"{instance.address}:{instance.port}"

    # ---------------------------
    # Key-Value Store
    # ---------------------------

    def kv_get(self, key: str) -> Optional[str]:
        """
        Get a value from Consul KV store.

        Args:
            key: Key path (e.g., "config/database/host")

        Returns:
            Value as string or None if not found
        """
        params = self._build_params(raw="true")

        response = self._client.get(
            f"/v1/kv/{key}",
            headers=self._headers,
            params=params
        )

        if response.status_code == 404:
            return None

        return response.text

    def kv_put(self, key: str, value: str) -> bool:
        """
        Store a value in Consul KV store.

        Args:
            key: Key path
            value: Value to store

        Returns:
            True if operation succeeded
        """
        response = self._client.put(
            f"/v1/kv/{key}",
            headers=self._headers,
            content=value
        )

        return response.status_code == 200 and response.text.strip() == "true"

    def kv_delete(self, key: str, recurse: bool = False) -> bool:
        """
        Delete a key from Consul KV store.

        Args:
            key: Key path to delete
            recurse: Delete all keys under this prefix

        Returns:
            True if deletion succeeded
        """
        params = self._build_params(recurse="true" if recurse else None)

        response = self._client.delete(
            f"/v1/kv/{key}",
            headers=self._headers,
            params=params
        )

        return response.status_code == 200

    def close(self):
        """Close the HTTP client"""
        self._client.close()
```

---

## Async Consul Client

For async applications, here is an async version of the client using httpx's async support.

```python
# async_consul_client.py
# Async Python client for Consul
import httpx
from typing import Optional, List
import asyncio

class AsyncConsulClient:
    """
    Async Consul client for use with asyncio applications.

    Example:
        async with AsyncConsulClient(config) as client:
            instances = await client.get_service("web-api")
    """

    def __init__(self, config: ConsulConfig):
        self.config = config
        self._client: Optional[httpx.AsyncClient] = None

        # Build default headers
        self._headers = {"Content-Type": "application/json"}
        if config.token:
            self._headers["X-Consul-Token"] = config.token

    async def __aenter__(self):
        """Async context manager entry"""
        self._client = httpx.AsyncClient(
            base_url=self.config.base_url,
            timeout=10.0
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self._client:
            await self._client.aclose()

    async def register_service(
        self,
        name: str,
        address: str,
        port: int,
        service_id: Optional[str] = None,
        tags: Optional[List[str]] = None,
        check_http: Optional[str] = None
    ) -> bool:
        """Register a service with Consul (async)"""
        service_def = {
            "ID": service_id or f"{name}-{address}-{port}",
            "Name": name,
            "Address": address,
            "Port": port,
            "Tags": tags or []
        }

        if check_http:
            service_def["Check"] = {
                "HTTP": check_http,
                "Interval": "10s",
                "Timeout": "5s",
                "DeregisterCriticalServiceAfter": "1m"
            }

        response = await self._client.put(
            "/v1/agent/service/register",
            headers=self._headers,
            json=service_def
        )

        return response.status_code == 200

    async def get_service(
        self,
        name: str,
        passing_only: bool = True
    ) -> List[ServiceInstance]:
        """Get service instances (async)"""
        params = {"passing": "true"} if passing_only else {}

        response = await self._client.get(
            f"/v1/health/service/{name}",
            headers=self._headers,
            params=params
        )

        if response.status_code != 200:
            return []

        instances = []
        for entry in response.json():
            service = entry["Service"]
            instances.append(ServiceInstance(
                id=service["ID"],
                name=service["Service"],
                address=service["Address"],
                port=service["Port"],
                tags=service.get("Tags", []),
                meta=service.get("Meta", {}),
                health=HealthStatus.PASSING  # Already filtered to passing
            ))

        return instances

    async def watch_service(
        self,
        name: str,
        callback,
        poll_interval: float = 5.0
    ):
        """
        Watch a service for changes and call callback when instances change.

        Args:
            name: Service name to watch
            callback: Async function called with new instance list
            poll_interval: Seconds between polls
        """
        last_instances = None

        while True:
            try:
                instances = await self.get_service(name)

                # Check if instances changed
                current_ids = {i.id for i in instances}
                last_ids = {i.id for i in last_instances} if last_instances else set()

                if current_ids != last_ids:
                    await callback(instances)
                    last_instances = instances

            except Exception as e:
                # Log error but continue watching
                print(f"Error watching service {name}: {e}")

            await asyncio.sleep(poll_interval)
```

---

## Service Discovery with Load Balancing

This module provides client-side load balancing across multiple service instances.

```python
# load_balancer.py
# Client-side load balancing using Consul service discovery
import random
from typing import Optional, List
from collections import defaultdict
import time

class LoadBalancer:
    """
    Client-side load balancer with multiple strategies.

    Supports:
    - Round-robin: Distribute requests evenly
    - Random: Pick random instance
    - Least-connections: Prefer instances with fewer active requests
    """

    def __init__(self, consul_client: ConsulClient):
        self.consul = consul_client
        self._round_robin_index = defaultdict(int)  # Track position per service
        self._active_connections = defaultdict(int)  # Track connections per instance
        self._cache = {}  # Cache service instances
        self._cache_ttl = 5.0  # Cache TTL in seconds
        self._cache_times = {}

    def _get_instances(self, service_name: str) -> List[ServiceInstance]:
        """Get instances with caching to reduce Consul calls"""
        now = time.time()
        cache_time = self._cache_times.get(service_name, 0)

        # Return cached instances if still valid
        if service_name in self._cache and (now - cache_time) < self._cache_ttl:
            return self._cache[service_name]

        # Fetch fresh instances from Consul
        instances = self.consul.get_service(service_name, passing_only=True)
        self._cache[service_name] = instances
        self._cache_times[service_name] = now

        return instances

    def get_instance_round_robin(
        self,
        service_name: str
    ) -> Optional[ServiceInstance]:
        """
        Get next instance using round-robin selection.
        Distributes load evenly across all instances.
        """
        instances = self._get_instances(service_name)
        if not instances:
            return None

        # Get current index and increment
        index = self._round_robin_index[service_name]
        self._round_robin_index[service_name] = (index + 1) % len(instances)

        return instances[index]

    def get_instance_random(
        self,
        service_name: str
    ) -> Optional[ServiceInstance]:
        """
        Get random instance. Simple but effective for most cases.
        """
        instances = self._get_instances(service_name)
        if not instances:
            return None

        return random.choice(instances)

    def get_instance_least_connections(
        self,
        service_name: str
    ) -> Optional[ServiceInstance]:
        """
        Get instance with fewest active connections.
        Best when request durations vary significantly.
        """
        instances = self._get_instances(service_name)
        if not instances:
            return None

        # Find instance with minimum active connections
        min_connections = float("inf")
        selected = instances[0]

        for instance in instances:
            connections = self._active_connections[instance.id]
            if connections < min_connections:
                min_connections = connections
                selected = instance

        return selected

    def mark_request_start(self, instance_id: str):
        """Mark that a request started to this instance"""
        self._active_connections[instance_id] += 1

    def mark_request_end(self, instance_id: str):
        """Mark that a request completed for this instance"""
        self._active_connections[instance_id] = max(
            0, self._active_connections[instance_id] - 1
        )

    def invalidate_cache(self, service_name: Optional[str] = None):
        """Force cache refresh for a service or all services"""
        if service_name:
            self._cache.pop(service_name, None)
            self._cache_times.pop(service_name, None)
        else:
            self._cache.clear()
            self._cache_times.clear()
```

---

## Service Mesh Integration

Here is how to integrate Consul service discovery with your FastAPI application.

```python
# fastapi_consul.py
# FastAPI integration with Consul service discovery
from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
import socket
import os

# Configuration from environment
CONSUL_HOST = os.environ.get("CONSUL_HOST", "localhost")
SERVICE_NAME = os.environ.get("SERVICE_NAME", "my-api")
SERVICE_PORT = int(os.environ.get("SERVICE_PORT", "8000"))

# Get the host's IP address for registration
def get_host_ip() -> str:
    """Get the IP address of this host"""
    try:
        # Create a socket to determine the outbound IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))  # Doesn't actually send data
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

# Global Consul client
consul_client: Optional[AsyncConsulClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage Consul registration during app lifecycle"""
    global consul_client

    # Create Consul client
    config = ConsulConfig(host=CONSUL_HOST)
    consul_client = AsyncConsulClient(config)

    async with consul_client:
        # Get our IP address
        host_ip = get_host_ip()
        service_id = f"{SERVICE_NAME}-{host_ip}-{SERVICE_PORT}"

        # Register with Consul on startup
        await consul_client.register_service(
            name=SERVICE_NAME,
            address=host_ip,
            port=SERVICE_PORT,
            service_id=service_id,
            tags=["api", "v1"],
            check_http=f"http://{host_ip}:{SERVICE_PORT}/health"
        )

        print(f"Registered {service_id} with Consul")

        yield  # Application runs here

        # Deregister on shutdown
        await consul_client.deregister_service(service_id)
        print(f"Deregistered {service_id} from Consul")

app = FastAPI(lifespan=lifespan)

@app.get("/health")
async def health():
    """Health check endpoint for Consul"""
    return {"status": "healthy"}

@app.get("/call-other-service")
async def call_other_service():
    """Example of calling another service via Consul discovery"""
    # Find instances of the target service
    instances = await consul_client.get_service("other-api")

    if not instances:
        return {"error": "Service not found"}

    # Pick first healthy instance
    instance = instances[0]
    target_url = f"http://{instance.address}:{instance.port}/api/data"

    # Make the call (using httpx in real code)
    return {"calling": target_url}
```

---

## Configuration Management with Consul KV

Use Consul's KV store for centralized configuration management.

```python
# config_manager.py
# Configuration management using Consul KV
from typing import Any, Optional
import json

class ConfigManager:
    """
    Manage application configuration through Consul KV store.

    Supports:
    - Hierarchical config keys
    - JSON values
    - Default values
    - Config watching for hot reload
    """

    def __init__(self, consul: ConsulClient, prefix: str = "config"):
        self.consul = consul
        self.prefix = prefix
        self._cache = {}

    def _full_key(self, key: str) -> str:
        """Build full key path with prefix"""
        return f"{self.prefix}/{key}"

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get a configuration value.

        Args:
            key: Config key (e.g., "database/host")
            default: Default value if key not found

        Returns:
            Configuration value or default
        """
        full_key = self._full_key(key)

        # Check cache first
        if full_key in self._cache:
            return self._cache[full_key]

        # Fetch from Consul
        value = self.consul.kv_get(full_key)

        if value is None:
            return default

        # Try to parse as JSON
        try:
            parsed = json.loads(value)
            self._cache[full_key] = parsed
            return parsed
        except json.JSONDecodeError:
            # Return as plain string
            self._cache[full_key] = value
            return value

    def set(self, key: str, value: Any) -> bool:
        """
        Set a configuration value.

        Args:
            key: Config key
            value: Value to store (will be JSON encoded if not string)

        Returns:
            True if successful
        """
        full_key = self._full_key(key)

        # Encode value as JSON if not already a string
        if isinstance(value, str):
            encoded = value
        else:
            encoded = json.dumps(value)

        # Store in Consul
        success = self.consul.kv_put(full_key, encoded)

        # Update cache on success
        if success:
            self._cache[full_key] = value

        return success

    def delete(self, key: str) -> bool:
        """Delete a configuration key"""
        full_key = self._full_key(key)
        success = self.consul.kv_delete(full_key)

        if success:
            self._cache.pop(full_key, None)

        return success

    def clear_cache(self):
        """Clear the local config cache"""
        self._cache.clear()

# Usage example
config = ConfigManager(consul_client, prefix="myapp/config")

# Set configuration values
config.set("database/host", "db.example.com")
config.set("database/port", 5432)
config.set("features", {"dark_mode": True, "beta_features": False})

# Get configuration values
db_host = config.get("database/host", "localhost")
features = config.get("features", {})
```

---

## Best Practices

### 1. Always Use Health Checks

```python
# Register with health check to enable auto-deregistration
client.register_service(
    name="my-api",
    address="10.0.0.1",
    port=8080,
    check_http="http://10.0.0.1:8080/health",
    check_interval="10s"
)
```

### 2. Handle Consul Unavailability

```python
# Implement retry with fallback
def get_service_with_fallback(name: str, fallback: str) -> str:
    try:
        address = consul.get_service_address(name)
        return address or fallback
    except Exception:
        return fallback
```

### 3. Use Tags for Versioning

```python
# Register with version tags
client.register_service(
    name="api",
    tags=["v2", "stable"],
    # ...
)

# Query specific version
v2_instances = client.get_service("api", tag="v2")
```

---

## Conclusion

Building a Consul client in Python enables your services to:

- **Discover services** dynamically instead of hardcoding addresses
- **Manage configuration** centrally with the KV store
- **Health check** services and auto-remove unhealthy instances
- **Load balance** across multiple instances client-side

Start simple with basic service discovery, then add features like caching and load balancing as your system grows.

---

*Need to monitor your service mesh? [OneUptime](https://oneuptime.com) integrates with Consul to provide deep visibility into your microservices architecture.*

**Related Reading:**
- [How to Build Health Checks in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Implement Circuit Breakers in Python](https://oneuptime.com/blog/post/2025-01-06-python-circuit-breakers/view)
