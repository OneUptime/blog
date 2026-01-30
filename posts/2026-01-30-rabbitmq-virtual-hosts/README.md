# How to Implement RabbitMQ Virtual Host Management

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RabbitMQ, Virtual Hosts, Multi-Tenancy, Messaging

Description: Learn how to implement RabbitMQ virtual host management for multi-tenant applications. This guide covers vhost creation, user permissions, resource isolation, and best practices for production environments.

---

> Virtual hosts in RabbitMQ provide logical separation between applications sharing the same broker. They enable multi-tenancy, resource isolation, and security boundaries without requiring separate RabbitMQ instances. Master vhost management to build scalable messaging architectures.

RabbitMQ virtual hosts (vhosts) are namespaces that group exchanges, queues, bindings, and permissions. Each vhost operates independently, making them essential for multi-tenant systems and environment separation.

---

## Overview

```mermaid
flowchart TB
    subgraph RabbitMQ["RabbitMQ Broker"]
        subgraph VHost1["Virtual Host: /production"]
            E1["Exchange: orders"]
            Q1["Queue: order-processing"]
            E1 --> Q1
        end
        subgraph VHost2["Virtual Host: /staging"]
            E2["Exchange: orders"]
            Q2["Queue: order-processing"]
            E2 --> Q2
        end
        subgraph VHost3["Virtual Host: /tenant-a"]
            E3["Exchange: events"]
            Q3["Queue: notifications"]
            E3 --> Q3
        end
    end

    App1["Production App"] --> VHost1
    App2["Staging App"] --> VHost2
    App3["Tenant A App"] --> VHost3
```

---

## Why Use Virtual Hosts?

Virtual hosts solve several architectural challenges:

| Use Case | Benefit |
|----------|---------|
| Multi-tenancy | Isolate customer data and messaging |
| Environment separation | Keep dev, staging, and production apart |
| Team boundaries | Give teams independent namespaces |
| Resource management | Apply limits per vhost |
| Security isolation | Separate permission domains |

---

## Creating Virtual Hosts

### Using rabbitmqctl

The `rabbitmqctl` command-line tool is the primary method for managing vhosts on the server:

```bash
# Create a new virtual host
rabbitmqctl add_vhost /production

# Create vhost with description and tags
rabbitmqctl add_vhost /tenant-acme \
    --description "ACME Corporation messaging namespace" \
    --tags "customer,premium"

# List all virtual hosts
rabbitmqctl list_vhosts name description tags

# Delete a virtual host (removes all resources within it)
rabbitmqctl delete_vhost /old-tenant
```

### Using the Management API

The HTTP API allows programmatic vhost management from any language:

```bash
# Create a virtual host using curl
curl -u admin:password -X PUT \
    http://localhost:15672/api/vhosts/production \
    -H "content-type: application/json" \
    -d '{"description": "Production environment", "tags": "production,critical"}'

# List all virtual hosts
curl -u admin:password \
    http://localhost:15672/api/vhosts

# Get details of a specific vhost
curl -u admin:password \
    http://localhost:15672/api/vhosts/production

# Delete a virtual host
curl -u admin:password -X DELETE \
    http://localhost:15672/api/vhosts/old-tenant
```

### Using Python with pika

Automate vhost management in your applications using the management API:

```python
# vhost_manager.py
import requests
from requests.auth import HTTPBasicAuth
from typing import Optional, List, Dict
import json

class RabbitMQVHostManager:
    """Manage RabbitMQ virtual hosts programmatically"""

    def __init__(self, host: str, port: int, username: str, password: str):
        self.base_url = f"http://{host}:{port}/api"
        self.auth = HTTPBasicAuth(username, password)
        self.headers = {"content-type": "application/json"}

    def create_vhost(
        self,
        name: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> bool:
        """
        Create a new virtual host.

        Args:
            name: The vhost name (e.g., 'production' or 'tenant-acme')
            description: Human-readable description
            tags: List of tags for categorization

        Returns:
            True if created successfully, False otherwise
        """
        url = f"{self.base_url}/vhosts/{name}"

        payload = {}
        if description:
            payload["description"] = description
        if tags:
            payload["tags"] = ",".join(tags)

        response = requests.put(
            url,
            auth=self.auth,
            headers=self.headers,
            data=json.dumps(payload) if payload else None
        )

        return response.status_code in (201, 204)

    def delete_vhost(self, name: str) -> bool:
        """
        Delete a virtual host and all its resources.

        Warning: This removes all exchanges, queues, and bindings in the vhost.
        """
        url = f"{self.base_url}/vhosts/{name}"
        response = requests.delete(url, auth=self.auth)
        return response.status_code == 204

    def list_vhosts(self) -> List[Dict]:
        """Get a list of all virtual hosts with their details"""
        url = f"{self.base_url}/vhosts"
        response = requests.get(url, auth=self.auth)
        return response.json() if response.status_code == 200 else []

    def vhost_exists(self, name: str) -> bool:
        """Check if a virtual host exists"""
        url = f"{self.base_url}/vhosts/{name}"
        response = requests.get(url, auth=self.auth)
        return response.status_code == 200


# Usage example
if __name__ == "__main__":
    manager = RabbitMQVHostManager(
        host="localhost",
        port=15672,
        username="admin",
        password="password"
    )

    # Create vhosts for different tenants
    tenants = ["tenant-alpha", "tenant-beta", "tenant-gamma"]

    for tenant in tenants:
        if not manager.vhost_exists(tenant):
            success = manager.create_vhost(
                name=tenant,
                description=f"Virtual host for {tenant}",
                tags=["customer", "active"]
            )
            print(f"Created vhost {tenant}: {success}")
        else:
            print(f"Vhost {tenant} already exists")
```

---

## User Permissions

### Permission Model

RabbitMQ uses a three-part permission model for each vhost:

```mermaid
flowchart LR
    User["User Account"] --> VHost["Virtual Host"]
    VHost --> Configure["Configure<br/>(create/delete)"]
    VHost --> Write["Write<br/>(publish)"]
    VHost --> Read["Read<br/>(consume)"]

    Configure --> Exchanges["Exchanges"]
    Configure --> Queues["Queues"]
    Write --> Exchanges
    Read --> Queues
```

Each permission is a regular expression pattern:
- **Configure**: Create and delete exchanges/queues matching the pattern
- **Write**: Publish messages to exchanges matching the pattern
- **Read**: Consume messages from queues matching the pattern

### Setting Permissions

```bash
# Grant full permissions to a user on a vhost
rabbitmqctl set_permissions -p /production app_user ".*" ".*" ".*"

# Grant limited permissions (read-only consumer)
rabbitmqctl set_permissions -p /production consumer_user "" "" ".*"

# Grant permissions only for specific prefixes
# User can only configure/write/read resources starting with "orders."
rabbitmqctl set_permissions -p /production orders_service "orders\..*" "orders\..*" "orders\..*"

# List permissions for a vhost
rabbitmqctl list_permissions -p /production

# List permissions for a user across all vhosts
rabbitmqctl list_user_permissions app_user

# Clear permissions for a user on a vhost
rabbitmqctl clear_permissions -p /production old_user
```

### Permission Patterns in Practice

```python
# permissions.py
import requests
from requests.auth import HTTPBasicAuth
from dataclasses import dataclass
from typing import Optional

@dataclass
class VHostPermission:
    """Represents RabbitMQ vhost permissions"""
    configure: str = ""  # Regex for resources user can configure
    write: str = ""      # Regex for exchanges user can publish to
    read: str = ""       # Regex for queues user can consume from

class PermissionManager:
    """Manage RabbitMQ user permissions on virtual hosts"""

    # Predefined permission patterns for common use cases
    FULL_ACCESS = VHostPermission(".*", ".*", ".*")
    READ_ONLY = VHostPermission("", "", ".*")
    WRITE_ONLY = VHostPermission("", ".*", "")
    NO_ACCESS = VHostPermission("", "", "")

    def __init__(self, host: str, port: int, username: str, password: str):
        self.base_url = f"http://{host}:{port}/api"
        self.auth = HTTPBasicAuth(username, password)
        self.headers = {"content-type": "application/json"}

    def set_permissions(
        self,
        username: str,
        vhost: str,
        permissions: VHostPermission
    ) -> bool:
        """
        Set permissions for a user on a virtual host.

        Args:
            username: The RabbitMQ user
            vhost: The virtual host name
            permissions: VHostPermission object with configure/write/read patterns
        """
        url = f"{self.base_url}/permissions/{vhost}/{username}"

        payload = {
            "configure": permissions.configure,
            "write": permissions.write,
            "read": permissions.read
        }

        response = requests.put(
            url,
            auth=self.auth,
            headers=self.headers,
            json=payload
        )

        return response.status_code in (201, 204)

    def create_service_permissions(
        self,
        username: str,
        vhost: str,
        service_prefix: str
    ) -> bool:
        """
        Create permissions scoped to a service prefix.

        Example: service_prefix="orders" allows access only to
        resources like "orders.created", "orders.processed", etc.
        """
        pattern = f"^{service_prefix}\\..*"
        permissions = VHostPermission(
            configure=pattern,
            write=pattern,
            read=pattern
        )
        return self.set_permissions(username, vhost, permissions)

    def get_permissions(self, username: str, vhost: str) -> Optional[VHostPermission]:
        """Get current permissions for a user on a vhost"""
        url = f"{self.base_url}/permissions/{vhost}/{username}"
        response = requests.get(url, auth=self.auth)

        if response.status_code == 200:
            data = response.json()
            return VHostPermission(
                configure=data.get("configure", ""),
                write=data.get("write", ""),
                read=data.get("read", "")
            )
        return None


# Usage example
if __name__ == "__main__":
    manager = PermissionManager(
        host="localhost",
        port=15672,
        username="admin",
        password="password"
    )

    # Give the orders service full access to orders-prefixed resources
    manager.create_service_permissions(
        username="orders_service",
        vhost="production",
        service_prefix="orders"
    )

    # Give a monitoring user read-only access
    manager.set_permissions(
        username="monitor",
        vhost="production",
        permissions=PermissionManager.READ_ONLY
    )
```

---

## Multi-Tenant Architecture

### Tenant Isolation Pattern

```mermaid
flowchart TB
    subgraph Gateway["API Gateway"]
        Router["Tenant Router"]
    end

    subgraph RabbitMQ["RabbitMQ Cluster"]
        subgraph TenantA["vhost: /tenant-a"]
            ExA["exchange: events"]
            QA["queue: notifications"]
        end
        subgraph TenantB["vhost: /tenant-b"]
            ExB["exchange: events"]
            QB["queue: notifications"]
        end
        subgraph TenantC["vhost: /tenant-c"]
            ExC["exchange: events"]
            QC["queue: notifications"]
        end
    end

    Router --> TenantA
    Router --> TenantB
    Router --> TenantC
```

### Tenant Provisioning Service

Automate the creation and configuration of tenant vhosts:

```python
# tenant_provisioning.py
import pika
from dataclasses import dataclass
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)

@dataclass
class TenantConfig:
    """Configuration for a new tenant"""
    tenant_id: str
    display_name: str
    plan: str  # "basic", "premium", "enterprise"

    @property
    def vhost_name(self) -> str:
        return f"tenant-{self.tenant_id}"

    @property
    def username(self) -> str:
        return f"user-{self.tenant_id}"


class TenantProvisioner:
    """
    Provisions RabbitMQ resources for new tenants.

    Creates a dedicated vhost, user, and standard exchanges/queues
    for each tenant to ensure complete isolation.
    """

    # Standard exchanges created for each tenant
    STANDARD_EXCHANGES = [
        {"name": "events", "type": "topic"},
        {"name": "commands", "type": "direct"},
        {"name": "notifications", "type": "fanout"},
    ]

    # Standard queues created for each tenant
    STANDARD_QUEUES = [
        "notifications",
        "events.processed",
        "commands.pending",
    ]

    def __init__(self, vhost_manager, permission_manager, rabbitmq_host: str):
        self.vhost_manager = vhost_manager
        self.permission_manager = permission_manager
        self.rabbitmq_host = rabbitmq_host

    def provision_tenant(self, config: TenantConfig) -> dict:
        """
        Provision all RabbitMQ resources for a new tenant.

        Returns:
            dict with connection details for the tenant
        """
        logger.info(f"Provisioning tenant: {config.tenant_id}")

        # Step 1: Create the virtual host
        self._create_vhost(config)

        # Step 2: Create tenant user with generated password
        password = self._create_user(config)

        # Step 3: Set permissions for the tenant user
        self._set_permissions(config)

        # Step 4: Create standard exchanges and queues
        self._create_topology(config, password)

        logger.info(f"Tenant {config.tenant_id} provisioned successfully")

        return {
            "vhost": config.vhost_name,
            "username": config.username,
            "password": password,
            "host": self.rabbitmq_host,
        }

    def _create_vhost(self, config: TenantConfig):
        """Create the tenant's virtual host"""
        self.vhost_manager.create_vhost(
            name=config.vhost_name,
            description=f"Virtual host for {config.display_name}",
            tags=[config.plan, "tenant", "active"]
        )

    def _create_user(self, config: TenantConfig) -> str:
        """Create a user for the tenant and return the generated password"""
        import secrets
        password = secrets.token_urlsafe(32)

        # Create user via management API
        import requests
        from requests.auth import HTTPBasicAuth

        url = f"http://{self.rabbitmq_host}:15672/api/users/{config.username}"
        response = requests.put(
            url,
            auth=HTTPBasicAuth("admin", "password"),
            json={
                "password": password,
                "tags": "tenant"
            }
        )

        if response.status_code not in (201, 204):
            raise Exception(f"Failed to create user: {response.text}")

        return password

    def _set_permissions(self, config: TenantConfig):
        """Set full permissions for tenant user on their vhost"""
        from permissions import VHostPermission

        self.permission_manager.set_permissions(
            username=config.username,
            vhost=config.vhost_name,
            permissions=VHostPermission(".*", ".*", ".*")
        )

    def _create_topology(self, config: TenantConfig, password: str):
        """Create standard exchanges and queues in the tenant's vhost"""
        # Connect to the tenant's vhost
        credentials = pika.PlainCredentials(config.username, password)
        parameters = pika.ConnectionParameters(
            host=self.rabbitmq_host,
            virtual_host=config.vhost_name,
            credentials=credentials
        )

        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        try:
            # Create standard exchanges
            for exchange in self.STANDARD_EXCHANGES:
                channel.exchange_declare(
                    exchange=exchange["name"],
                    exchange_type=exchange["type"],
                    durable=True
                )
                logger.debug(f"Created exchange: {exchange['name']}")

            # Create standard queues
            for queue in self.STANDARD_QUEUES:
                channel.queue_declare(queue=queue, durable=True)
                logger.debug(f"Created queue: {queue}")

            # Create standard bindings
            channel.queue_bind(
                queue="notifications",
                exchange="notifications"
            )
            channel.queue_bind(
                queue="events.processed",
                exchange="events",
                routing_key="*.processed"
            )

        finally:
            connection.close()

    def deprovision_tenant(self, tenant_id: str):
        """Remove all resources for a tenant"""
        vhost_name = f"tenant-{tenant_id}"
        username = f"user-{tenant_id}"

        # Delete vhost (this removes all exchanges, queues, and bindings)
        self.vhost_manager.delete_vhost(vhost_name)

        # Delete user
        import requests
        from requests.auth import HTTPBasicAuth

        url = f"http://{self.rabbitmq_host}:15672/api/users/{username}"
        requests.delete(url, auth=HTTPBasicAuth("admin", "password"))

        logger.info(f"Tenant {tenant_id} deprovisioned")
```

---

## Resource Limits

### Setting Vhost Limits

Prevent tenants from consuming excessive resources:

```bash
# Set maximum number of queues in a vhost
rabbitmqctl set_vhost_limits -p /tenant-basic '{"max-queues": 100}'

# Set maximum number of connections to a vhost
rabbitmqctl set_vhost_limits -p /tenant-basic '{"max-connections": 50}'

# Set both limits at once
rabbitmqctl set_vhost_limits -p /tenant-basic '{"max-queues": 100, "max-connections": 50}'

# View current limits
rabbitmqctl list_vhost_limits

# Clear limits for a vhost
rabbitmqctl clear_vhost_limits -p /tenant-basic
```

### Plan-Based Limits

```python
# resource_limits.py
import requests
from requests.auth import HTTPBasicAuth
from dataclasses import dataclass
from typing import Optional
import json

@dataclass
class VHostLimits:
    """Resource limits for a virtual host"""
    max_queues: Optional[int] = None
    max_connections: Optional[int] = None

class ResourceLimitManager:
    """Manage resource limits on RabbitMQ virtual hosts"""

    # Predefined limits for different subscription plans
    PLAN_LIMITS = {
        "basic": VHostLimits(max_queues=50, max_connections=20),
        "premium": VHostLimits(max_queues=500, max_connections=100),
        "enterprise": VHostLimits(max_queues=None, max_connections=None),  # Unlimited
    }

    def __init__(self, host: str, port: int, username: str, password: str):
        self.base_url = f"http://{host}:{port}/api"
        self.auth = HTTPBasicAuth(username, password)
        self.headers = {"content-type": "application/json"}

    def set_limits(self, vhost: str, limits: VHostLimits) -> bool:
        """
        Set resource limits on a virtual host.

        Args:
            vhost: The virtual host name
            limits: VHostLimits object specifying the constraints
        """
        url = f"{self.base_url}/vhost-limits/{vhost}/max-queues"

        # Build the limits definition
        limit_def = {}
        if limits.max_queues is not None:
            limit_def["max-queues"] = limits.max_queues
        if limits.max_connections is not None:
            limit_def["max-connections"] = limits.max_connections

        # Set each limit individually via the API
        success = True

        if limits.max_queues is not None:
            url = f"{self.base_url}/vhost-limits/{vhost}/max-queues"
            response = requests.put(
                url,
                auth=self.auth,
                headers=self.headers,
                json={"value": limits.max_queues}
            )
            success = success and response.status_code in (200, 201, 204)

        if limits.max_connections is not None:
            url = f"{self.base_url}/vhost-limits/{vhost}/max-connections"
            response = requests.put(
                url,
                auth=self.auth,
                headers=self.headers,
                json={"value": limits.max_connections}
            )
            success = success and response.status_code in (200, 201, 204)

        return success

    def apply_plan_limits(self, vhost: str, plan: str) -> bool:
        """Apply predefined limits based on subscription plan"""
        if plan not in self.PLAN_LIMITS:
            raise ValueError(f"Unknown plan: {plan}")

        limits = self.PLAN_LIMITS[plan]
        return self.set_limits(vhost, limits)

    def get_limits(self, vhost: str) -> VHostLimits:
        """Get current limits for a virtual host"""
        url = f"{self.base_url}/vhost-limits/{vhost}"
        response = requests.get(url, auth=self.auth)

        if response.status_code == 200:
            data = response.json()
            return VHostLimits(
                max_queues=data.get("max-queues"),
                max_connections=data.get("max-connections")
            )
        return VHostLimits()

    def clear_limits(self, vhost: str) -> bool:
        """Remove all limits from a virtual host"""
        url = f"{self.base_url}/vhost-limits/{vhost}"
        response = requests.delete(url, auth=self.auth)
        return response.status_code == 204
```

---

## Connection Management

### Connecting to a Specific Vhost

```python
# connection_examples.py
import pika
import os

def connect_to_vhost(vhost: str) -> pika.BlockingConnection:
    """
    Create a connection to a specific virtual host.

    The virtual host must exist and the user must have permissions.
    """
    credentials = pika.PlainCredentials(
        username=os.getenv("RABBITMQ_USER", "guest"),
        password=os.getenv("RABBITMQ_PASS", "guest")
    )

    parameters = pika.ConnectionParameters(
        host=os.getenv("RABBITMQ_HOST", "localhost"),
        port=int(os.getenv("RABBITMQ_PORT", 5672)),
        virtual_host=vhost,  # Specify the vhost here
        credentials=credentials,
        # Connection retry settings
        connection_attempts=3,
        retry_delay=5,
        # Heartbeat to detect dead connections
        heartbeat=60
    )

    return pika.BlockingConnection(parameters)


def connect_with_url(vhost: str) -> pika.BlockingConnection:
    """Connect using an AMQP URL with the vhost encoded"""
    # URL encode the vhost (/ becomes %2F)
    from urllib.parse import quote
    encoded_vhost = quote(vhost, safe="")

    url = f"amqp://user:password@localhost:5672/{encoded_vhost}"
    parameters = pika.URLParameters(url)

    return pika.BlockingConnection(parameters)


# Usage example
if __name__ == "__main__":
    # Connect to production vhost
    production_conn = connect_to_vhost("/production")
    production_channel = production_conn.channel()

    # Connect to tenant-specific vhost
    tenant_conn = connect_to_vhost("tenant-acme")
    tenant_channel = tenant_conn.channel()

    # Publish to the correct vhost
    tenant_channel.basic_publish(
        exchange="events",
        routing_key="order.created",
        body=b'{"order_id": "12345"}'
    )
```

### Connection Pool with Vhost Support

```python
# connection_pool.py
import pika
from typing import Dict, Optional
from contextlib import contextmanager
import threading
import queue
import logging

logger = logging.getLogger(__name__)

class VHostConnectionPool:
    """
    Connection pool that manages connections to multiple virtual hosts.

    Each vhost has its own pool of connections to prevent cross-tenant
    connection sharing and enable per-vhost connection limits.
    """

    def __init__(
        self,
        host: str,
        username: str,
        password: str,
        pool_size: int = 10
    ):
        self.host = host
        self.username = username
        self.password = password
        self.pool_size = pool_size

        # Separate pool for each vhost
        self._pools: Dict[str, queue.Queue] = {}
        self._lock = threading.Lock()

    def _get_pool(self, vhost: str) -> queue.Queue:
        """Get or create a connection pool for a vhost"""
        if vhost not in self._pools:
            with self._lock:
                if vhost not in self._pools:
                    self._pools[vhost] = queue.Queue(maxsize=self.pool_size)
        return self._pools[vhost]

    def _create_connection(self, vhost: str) -> pika.BlockingConnection:
        """Create a new connection to a specific vhost"""
        credentials = pika.PlainCredentials(self.username, self.password)
        parameters = pika.ConnectionParameters(
            host=self.host,
            virtual_host=vhost,
            credentials=credentials,
            heartbeat=60
        )
        return pika.BlockingConnection(parameters)

    @contextmanager
    def get_connection(self, vhost: str):
        """
        Get a connection from the pool for the specified vhost.

        Usage:
            with pool.get_connection("tenant-acme") as conn:
                channel = conn.channel()
                # Use the channel
        """
        pool = self._get_pool(vhost)
        connection = None

        try:
            # Try to get an existing connection from the pool
            try:
                connection = pool.get_nowait()
                # Verify the connection is still alive
                if not connection.is_open:
                    connection = None
            except queue.Empty:
                pass

            # Create a new connection if needed
            if connection is None:
                connection = self._create_connection(vhost)
                logger.debug(f"Created new connection for vhost: {vhost}")

            yield connection

        finally:
            # Return connection to pool if it's still open
            if connection and connection.is_open:
                try:
                    pool.put_nowait(connection)
                except queue.Full:
                    # Pool is full, close the connection
                    connection.close()

    def close_all(self):
        """Close all connections in all pools"""
        for vhost, pool in self._pools.items():
            while not pool.empty():
                try:
                    conn = pool.get_nowait()
                    conn.close()
                except:
                    pass
        self._pools.clear()


# Usage example
if __name__ == "__main__":
    pool = VHostConnectionPool(
        host="localhost",
        username="admin",
        password="password",
        pool_size=5
    )

    # Use connections for different tenants
    with pool.get_connection("tenant-alpha") as conn:
        channel = conn.channel()
        channel.basic_publish(
            exchange="events",
            routing_key="user.signup",
            body=b'{"user_id": "123"}'
        )

    with pool.get_connection("tenant-beta") as conn:
        channel = conn.channel()
        channel.basic_publish(
            exchange="events",
            routing_key="user.signup",
            body=b'{"user_id": "456"}'
        )
```

---

## Monitoring Virtual Hosts

### Metrics Collection

```python
# vhost_monitoring.py
import requests
from requests.auth import HTTPBasicAuth
from dataclasses import dataclass
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

@dataclass
class VHostMetrics:
    """Metrics for a single virtual host"""
    name: str
    messages: int
    messages_ready: int
    messages_unacknowledged: int
    queues: int
    connections: int
    consumers: int
    publish_rate: float
    deliver_rate: float

class VHostMonitor:
    """Monitor RabbitMQ virtual host health and performance"""

    def __init__(self, host: str, port: int, username: str, password: str):
        self.base_url = f"http://{host}:{port}/api"
        self.auth = HTTPBasicAuth(username, password)

    def get_vhost_metrics(self, vhost: str) -> VHostMetrics:
        """Get detailed metrics for a specific virtual host"""
        # Get vhost overview
        vhost_url = f"{self.base_url}/vhosts/{vhost}"
        vhost_data = requests.get(vhost_url, auth=self.auth).json()

        # Get queue count
        queues_url = f"{self.base_url}/queues/{vhost}"
        queues_data = requests.get(queues_url, auth=self.auth).json()

        # Get connection count
        connections_url = f"{self.base_url}/vhosts/{vhost}/connections"
        connections_data = requests.get(connections_url, auth=self.auth).json()

        # Extract message stats
        msg_stats = vhost_data.get("message_stats", {})

        return VHostMetrics(
            name=vhost,
            messages=vhost_data.get("messages", 0),
            messages_ready=vhost_data.get("messages_ready", 0),
            messages_unacknowledged=vhost_data.get("messages_unacknowledged", 0),
            queues=len(queues_data),
            connections=len(connections_data),
            consumers=sum(q.get("consumers", 0) for q in queues_data),
            publish_rate=msg_stats.get("publish_details", {}).get("rate", 0),
            deliver_rate=msg_stats.get("deliver_get_details", {}).get("rate", 0)
        )

    def get_all_vhost_metrics(self) -> List[VHostMetrics]:
        """Get metrics for all virtual hosts"""
        vhosts_url = f"{self.base_url}/vhosts"
        vhosts = requests.get(vhosts_url, auth=self.auth).json()

        metrics = []
        for vhost in vhosts:
            try:
                m = self.get_vhost_metrics(vhost["name"])
                metrics.append(m)
            except Exception as e:
                logger.warning(f"Failed to get metrics for {vhost['name']}: {e}")

        return metrics

    def check_health(self, vhost: str) -> Dict:
        """
        Check health of a virtual host.

        Returns a dict with health status and any issues found.
        """
        metrics = self.get_vhost_metrics(vhost)

        issues = []

        # Check for message backlog
        if metrics.messages_ready > 10000:
            issues.append(f"High message backlog: {metrics.messages_ready}")

        # Check for unacked messages (potential consumer issues)
        if metrics.messages_unacknowledged > 1000:
            issues.append(f"High unacked messages: {metrics.messages_unacknowledged}")

        # Check for no consumers
        if metrics.consumers == 0 and metrics.messages > 0:
            issues.append("No active consumers but messages in queues")

        # Check publish/consume ratio
        if metrics.publish_rate > 0 and metrics.deliver_rate == 0:
            issues.append("Messages being published but not consumed")

        return {
            "vhost": vhost,
            "healthy": len(issues) == 0,
            "issues": issues,
            "metrics": metrics
        }


# Usage example
if __name__ == "__main__":
    monitor = VHostMonitor(
        host="localhost",
        port=15672,
        username="admin",
        password="password"
    )

    # Check health of all tenants
    all_metrics = monitor.get_all_vhost_metrics()

    for m in all_metrics:
        health = monitor.check_health(m.name)
        status = "OK" if health["healthy"] else "ISSUES"
        print(f"{m.name}: {status}")
        for issue in health["issues"]:
            print(f"  - {issue}")
```

### Prometheus Metrics Export

```python
# prometheus_exporter.py
from prometheus_client import Gauge, Counter, start_http_server
from vhost_monitoring import VHostMonitor
import time
import threading

# Define Prometheus metrics
vhost_messages = Gauge(
    "rabbitmq_vhost_messages_total",
    "Total messages in vhost",
    ["vhost"]
)

vhost_messages_ready = Gauge(
    "rabbitmq_vhost_messages_ready",
    "Messages ready for delivery",
    ["vhost"]
)

vhost_connections = Gauge(
    "rabbitmq_vhost_connections",
    "Number of connections to vhost",
    ["vhost"]
)

vhost_queues = Gauge(
    "rabbitmq_vhost_queues",
    "Number of queues in vhost",
    ["vhost"]
)

vhost_publish_rate = Gauge(
    "rabbitmq_vhost_publish_rate",
    "Message publish rate per second",
    ["vhost"]
)

def collect_metrics(monitor: VHostMonitor):
    """Collect and update Prometheus metrics for all vhosts"""
    while True:
        try:
            metrics = monitor.get_all_vhost_metrics()

            for m in metrics:
                vhost_messages.labels(vhost=m.name).set(m.messages)
                vhost_messages_ready.labels(vhost=m.name).set(m.messages_ready)
                vhost_connections.labels(vhost=m.name).set(m.connections)
                vhost_queues.labels(vhost=m.name).set(m.queues)
                vhost_publish_rate.labels(vhost=m.name).set(m.publish_rate)

        except Exception as e:
            print(f"Error collecting metrics: {e}")

        # Collect every 15 seconds
        time.sleep(15)

if __name__ == "__main__":
    monitor = VHostMonitor(
        host="localhost",
        port=15672,
        username="admin",
        password="password"
    )

    # Start Prometheus HTTP server
    start_http_server(9090)
    print("Prometheus metrics available at http://localhost:9090/metrics")

    # Start collection in background
    collector = threading.Thread(target=collect_metrics, args=(monitor,), daemon=True)
    collector.start()

    # Keep main thread alive
    while True:
        time.sleep(60)
```

---

## Production Configuration

### RabbitMQ Configuration File

```ini
# /etc/rabbitmq/rabbitmq.conf

# Default vhost for new connections
default_vhost = /

# Default user permissions on default vhost
default_permissions.configure = .*
default_permissions.write = .*
default_permissions.read = .*

# Limit total connections per vhost (can be overridden per-vhost)
# This is a cluster-wide default
vhost_max_connections = 1000

# Limit total queues per vhost (can be overridden per-vhost)
vhost_max_queues = 500

# Enable management plugin for HTTP API
management.listener.port = 15672
management.listener.ip = 0.0.0.0

# Collect statistics every 5 seconds
collect_statistics_interval = 5000
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: '3.8'

services:
  rabbitmq:
    image: rabbitmq:3.12-management
    hostname: rabbitmq
    ports:
      - "5672:5672"    # AMQP
      - "15672:15672"  # Management UI
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
      - ./rabbitmq-init.sh:/docker-entrypoint-initdb.d/init.sh:ro
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 30s
      timeout: 10s
      retries: 5

  vhost-provisioner:
    build: .
    depends_on:
      rabbitmq:
        condition: service_healthy
    environment:
      RABBITMQ_HOST: rabbitmq
      RABBITMQ_USER: admin
      RABBITMQ_PASS: password
    command: python provision_vhosts.py

volumes:
  rabbitmq_data:
```

### Initialization Script

```bash
#!/bin/bash
# rabbitmq-init.sh - Run after RabbitMQ starts

# Wait for RabbitMQ to be ready
until rabbitmqctl status > /dev/null 2>&1; do
    echo "Waiting for RabbitMQ..."
    sleep 2
done

echo "Creating virtual hosts..."

# Create environment vhosts
rabbitmqctl add_vhost /production
rabbitmqctl add_vhost /staging
rabbitmqctl add_vhost /development

# Create service user for production
rabbitmqctl add_user app_service "$(cat /run/secrets/app_password)"
rabbitmqctl set_permissions -p /production app_service ".*" ".*" ".*"

# Create read-only monitoring user
rabbitmqctl add_user monitor "$(cat /run/secrets/monitor_password)"
rabbitmqctl set_permissions -p /production monitor "" "" ".*"
rabbitmqctl set_permissions -p /staging monitor "" "" ".*"

# Set resource limits
rabbitmqctl set_vhost_limits -p /staging '{"max-queues": 100, "max-connections": 50}'

echo "Virtual hosts configured successfully"
```

---

## Best Practices

### Naming Conventions

```mermaid
flowchart LR
    subgraph Environments
        E1["/production"]
        E2["/staging"]
        E3["/development"]
    end

    subgraph Tenants
        T1["tenant-{id}"]
        T2["tenant-acme"]
        T3["tenant-globex"]
    end

    subgraph Services
        S1["service-{name}"]
        S2["service-orders"]
        S3["service-payments"]
    end
```

### Security Checklist

1. **Principle of least privilege** - Grant only necessary permissions
2. **Separate users per service** - Do not share credentials
3. **Use TLS for connections** - Encrypt data in transit
4. **Regular permission audits** - Review and revoke unused access
5. **Rotate credentials** - Change passwords periodically
6. **Monitor failed connections** - Detect unauthorized access attempts

### Operational Guidelines

| Practice | Recommendation |
|----------|---------------|
| Vhost naming | Use lowercase with hyphens (tenant-acme) |
| Default vhost | Never use / for applications |
| Resource limits | Always set limits for tenant vhosts |
| Monitoring | Track per-vhost metrics separately |
| Backups | Include vhost definitions in disaster recovery |
| Documentation | Maintain a registry of vhosts and owners |

---

## Troubleshooting

### Common Issues

**"NOT_ALLOWED - vhost does not exist"**

```python
# Check if vhost exists before connecting
def safe_connect(vhost: str):
    manager = RabbitMQVHostManager(...)

    if not manager.vhost_exists(vhost):
        raise ValueError(f"Virtual host '{vhost}' does not exist")

    return connect_to_vhost(vhost)
```

**"ACCESS_REFUSED - permission denied"**

```bash
# Verify user permissions
rabbitmqctl list_user_permissions your_user

# Check vhost permissions
rabbitmqctl list_permissions -p /your-vhost

# Grant permissions if missing
rabbitmqctl set_permissions -p /your-vhost your_user ".*" ".*" ".*"
```

**Connection limit reached**

```bash
# Check current connections
rabbitmqctl list_connections vhost

# Check vhost limits
rabbitmqctl list_vhost_limits -p /your-vhost

# Increase limit if needed
rabbitmqctl set_vhost_limits -p /your-vhost '{"max-connections": 200}'
```

---

## Conclusion

RabbitMQ virtual hosts provide essential isolation capabilities for multi-tenant applications and environment separation. Key takeaways:

- **Use vhosts for isolation** - separate tenants, environments, and services
- **Apply resource limits** - prevent resource exhaustion
- **Implement proper permissions** - follow least privilege principle
- **Monitor per-vhost metrics** - detect issues early
- **Automate provisioning** - use the management API for consistency

Virtual hosts are fundamental to building scalable, secure messaging architectures with RabbitMQ.

---

*Building a multi-tenant messaging system? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for RabbitMQ clusters with per-vhost metrics, alerting, and performance insights.*
