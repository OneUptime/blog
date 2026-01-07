# How to Build Health Checks and Readiness Probes in Python for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Kubernetes, Health Checks, Readiness Probes, FastAPI, Flask, DevOps, Reliability

Description: Learn how to implement robust health checks and readiness probes in Python applications for Kubernetes. This guide covers liveness, readiness, and startup probes with practical examples.

---

> Kubernetes relies on health checks to know if your application is working. Without proper probes, Kubernetes can't make intelligent decisions about routing traffic or restarting unhealthy pods. This guide shows you how to implement health checks that actually tell Kubernetes what it needs to know.

Health checks are your application's way of communicating with Kubernetes. Get them right, and Kubernetes will keep your application running smoothly. Get them wrong, and you'll have cascading failures or traffic going to unhealthy pods.

---

## Understanding Kubernetes Probes

Kubernetes supports three types of probes:

| Probe Type | Purpose | What Happens on Failure |
|------------|---------|------------------------|
| **Liveness** | Is the process alive? | Pod is restarted |
| **Readiness** | Can it handle traffic? | Pod removed from service |
| **Startup** | Has it started? | Other probes wait |

### Key Differences

```yaml
# Liveness: "Should I restart this container?"
livenessProbe:
  httpGet:
    path: /health
    port: 8000

# Readiness: "Should I send traffic to this container?"
readinessProbe:
  httpGet:
    path: /ready
    port: 8000

# Startup: "Has this container finished starting?"
startupProbe:
  httpGet:
    path: /health
    port: 8000
  failureThreshold: 30
```

---

## Basic Health Check Implementation

### FastAPI Implementation

This basic implementation shows how to set up liveness and readiness endpoints in FastAPI. The liveness probe returns a simple health status, while the readiness probe tracks whether the application has completed its initialization phase.

```python
# health_checks.py
# FastAPI health check endpoints for Kubernetes probes
from fastapi import FastAPI, Response, status
from datetime import datetime
import asyncio

app = FastAPI()

# Track when the app started and whether initialization is complete
startup_time = datetime.utcnow()
ready = False  # Set to True after all services are initialized

@app.on_event("startup")
async def startup():
    global ready
    # Initialize all required services before accepting traffic
    # Examples: DB connections, cache warming, loading ML models
    await initialize_services()
    ready = True  # Now safe to receive traffic

@app.get("/health")
async def health_check():
    """
    Liveness probe - is the process alive?
    Should return 200 if the process is running.
    Keep this simple - don't check external dependencies here.
    """
    # Return minimal response - this should be fast and reliable
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()  # Useful for debugging
    }

@app.get("/ready")
async def readiness_check(response: Response):
    """
    Readiness probe - can we handle traffic?
    Should check if the application is ready to serve requests.
    """
    # Check if initialization is complete
    if not ready:
        # Return 503 to tell Kubernetes not to send traffic yet
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "reason": "Service is starting up"
        }

    # Application is ready to receive traffic
    return {
        "status": "ready",
        "uptime_seconds": (datetime.utcnow() - startup_time).total_seconds()
    }
```

### Flask Implementation

The Flask equivalent uses the `before_first_request` decorator to handle initialization. This ensures services are set up before the first request is processed, and the readiness endpoint reflects this state.

```python
# flask_health.py
# Flask health check endpoints for Kubernetes probes
from flask import Flask, jsonify
from datetime import datetime

app = Flask(__name__)

# Track startup time and initialization state
startup_time = datetime.utcnow()
ready = False  # Becomes True after first request initializes services

@app.before_first_request
def initialize():
    global ready
    # This runs before the first request is handled
    # Initialize database connections, caches, etc.
    ready = True

@app.route('/health')
def health():
    """Liveness probe - simple check that process is running"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/ready')
def ready_check():
    """Readiness probe - check if app can handle traffic"""
    if not ready:
        # Return 503 with JSON body explaining the state
        return jsonify({
            "status": "not_ready",
            "reason": "Initializing"
        }), 503  # Service Unavailable

    return jsonify({
        "status": "ready",
        "uptime": str(datetime.utcnow() - startup_time)  # Human-readable uptime
    })
```

---

## Comprehensive Health Check Service

This service provides a centralized way to manage health checks across your application. It supports multiple components, tracks startup/shutdown states, and handles timeouts gracefully. The service can differentiate between healthy, degraded, and unhealthy states.

```python
# health_service.py
# Comprehensive health check management with component tracking
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Callable, Awaitable
from datetime import datetime
import asyncio

class HealthStatus(Enum):
    """Possible health states for a component"""
    HEALTHY = "healthy"  # Component is working normally
    DEGRADED = "degraded"  # Component works but with issues
    UNHEALTHY = "unhealthy"  # Component is not working

@dataclass
class ComponentHealth:
    """Data class representing the health state of a single component"""
    name: str  # Component identifier (e.g., "database", "redis")
    status: HealthStatus  # Current health status
    message: Optional[str] = None  # Optional error or status message
    latency_ms: Optional[float] = None  # Response time in milliseconds
    details: Optional[Dict] = None  # Additional details (pool size, version, etc.)

class HealthCheckService:
    """Comprehensive health check management for Kubernetes probes"""

    def __init__(self):
        self._checks: Dict[str, Callable] = {}  # Registered health check functions
        self._shutdown_requested = False  # True when graceful shutdown starts
        self._startup_complete = False  # True when initialization finishes

    def register_check(self, name: str, check: Callable[[], Awaitable[bool]]):
        """Register an async health check function for a component"""
        self._checks[name] = check

    def set_startup_complete(self):
        """Call this after all initialization is done"""
        self._startup_complete = True

    def request_shutdown(self):
        """Call this when graceful shutdown begins"""
        self._shutdown_requested = True

    async def check_component(
        self,
        name: str,
        check: Callable
    ) -> ComponentHealth:
        """Run a single health check with timeout protection"""
        start = datetime.utcnow()

        try:
            # Run check with timeout to prevent hanging probes
            result = await asyncio.wait_for(check(), timeout=5.0)
            latency = (datetime.utcnow() - start).total_seconds() * 1000

            return ComponentHealth(
                name=name,
                status=HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY,
                latency_ms=latency
            )
        except asyncio.TimeoutError:
            # Health check took too long - treat as unhealthy
            return ComponentHealth(
                name=name,
                status=HealthStatus.UNHEALTHY,
                message="Health check timeout"
            )
        except Exception as e:
            # Any exception means the component is unhealthy
            return ComponentHealth(
                name=name,
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )

    async def get_liveness(self) -> Dict:
        """
        Liveness check - is the process alive?
        Should be simple and fast. Don't check dependencies.
        """
        # Kubernetes restarts pod if this fails repeatedly
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat()
        }

    async def get_readiness(self) -> tuple[Dict, int]:
        """
        Readiness check - can we handle traffic?
        Checks all registered components and returns appropriate status.
        """
        # During shutdown, stop accepting new traffic
        if self._shutdown_requested:
            return {
                "status": "not_ready",
                "reason": "Shutdown in progress"
            }, 503

        # During startup, wait until initialization completes
        if not self._startup_complete:
            return {
                "status": "not_ready",
                "reason": "Startup in progress"
            }, 503

        # Run all registered health checks
        results = []
        for name, check in self._checks.items():
            result = await self.check_component(name, check)
            results.append(result)

        # Categorize results by status
        unhealthy = [r for r in results if r.status == HealthStatus.UNHEALTHY]
        degraded = [r for r in results if r.status == HealthStatus.DEGRADED]

        # Determine overall status based on component health
        if unhealthy:
            # Any unhealthy component means not ready for traffic
            return {
                "status": "not_ready",
                "unhealthy_components": [r.name for r in unhealthy],
                "components": [self._serialize_component(r) for r in results]
            }, 503
        elif degraded:
            # Degraded components - still accept traffic but flag the issue
            return {
                "status": "degraded",
                "degraded_components": [r.name for r in degraded],
                "components": [self._serialize_component(r) for r in results]
            }, 200
        else:
            # All components healthy
            return {
                "status": "ready",
                "components": [self._serialize_component(r) for r in results]
            }, 200

    async def get_startup(self) -> tuple[Dict, int]:
        """
        Startup check - has the application finished starting?
        Kubernetes uses this to know when to start liveness/readiness probes.
        """
        if self._startup_complete:
            return {"status": "started"}, 200
        else:
            return {"status": "starting"}, 503

    def _serialize_component(self, component: ComponentHealth) -> Dict:
        """Convert ComponentHealth to JSON-serializable dict"""
        return {
            "name": component.name,
            "status": component.status.value,
            "message": component.message,
            "latency_ms": component.latency_ms
        }
```

---

## FastAPI Integration with Dependencies

This example shows how to integrate the health check service with real dependencies like PostgreSQL and Redis. The lifespan context manager handles startup and shutdown, while the health checks verify database and cache connectivity.

```python
# fastapi_health.py
# FastAPI integration with database and Redis health checks
from fastapi import FastAPI, Response, Depends
from contextlib import asynccontextmanager
import asyncpg
import aioredis

# Initialize the health check service
health_service = HealthCheckService()

# Global connection pool references (populated during startup)
db_pool: asyncpg.Pool = None
redis_client: aioredis.Redis = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown"""
    global db_pool, redis_client

    # === STARTUP PHASE ===
    # Create database connection pool with min/max size limits
    db_pool = await asyncpg.create_pool(
        "postgresql://localhost/mydb",
        min_size=5,  # Keep 5 connections warm
        max_size=20  # Scale up to 20 under load
    )

    # Create Redis client connection
    redis_client = await aioredis.from_url("redis://localhost")

    # Register health check functions for each dependency
    health_service.register_check("database", check_database)
    health_service.register_check("redis", check_redis)

    # Signal that startup is complete - readiness probe will now pass
    health_service.set_startup_complete()

    yield  # Application runs here

    # === SHUTDOWN PHASE ===
    # Mark as shutting down - readiness probe will now fail
    health_service.request_shutdown()
    # Close all connections gracefully
    await db_pool.close()
    await redis_client.close()

# Create FastAPI app with lifecycle management
app = FastAPI(lifespan=lifespan)

async def check_database() -> bool:
    """Verify database is reachable with a simple query"""
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")  # Simple connectivity test
        return True
    except Exception:
        return False  # Any error means unhealthy

async def check_redis() -> bool:
    """Verify Redis is reachable with a ping command"""
    try:
        await redis_client.ping()  # Built-in Redis health check
        return True
    except Exception:
        return False  # Any error means unhealthy

@app.get("/health")
async def liveness():
    """Liveness probe - Kubernetes restarts pod if this fails"""
    return await health_service.get_liveness()

@app.get("/ready")
async def readiness(response: Response):
    """Readiness probe - Kubernetes removes pod from service if this fails"""
    result, status_code = await health_service.get_readiness()
    response.status_code = status_code  # Set appropriate HTTP status
    return result

@app.get("/startup")
async def startup(response: Response):
    """Startup probe - Kubernetes waits for this before other probes"""
    result, status_code = await health_service.get_startup()
    response.status_code = status_code
    return result

@app.get("/health/detailed")
async def detailed_health(response: Response):
    """Detailed health check for debugging - includes all component status"""
    result, status_code = await health_service.get_readiness()
    response.status_code = status_code
    return result
```

---

## Kubernetes Deployment Configuration

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: python-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: python-api
  template:
    metadata:
      labels:
        app: python-api
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: api
        image: python-api:latest
        ports:
        - containerPort: 8000

        # Startup Probe - for slow-starting applications
        startupProbe:
          httpGet:
            path: /startup
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
          failureThreshold: 30  # 5 * 30 = 150 seconds max startup
          timeoutSeconds: 5

        # Liveness Probe - restart if unhealthy
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 0  # Startup probe handles initial delay
          periodSeconds: 10
          failureThreshold: 3
          timeoutSeconds: 5

        # Readiness Probe - remove from service if not ready
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 0  # Startup probe handles initial delay
          periodSeconds: 5
          failureThreshold: 3
          successThreshold: 1
          timeoutSeconds: 5

        # Lifecycle hooks
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Handling Graceful Shutdown

Graceful shutdown ensures that in-flight requests complete before the application stops. This example shows how to handle SIGTERM signals from Kubernetes, mark the service as not ready (to stop receiving new traffic), and clean up resources properly.

```python
# graceful_shutdown.py
# Graceful shutdown handling for Kubernetes deployments
from fastapi import FastAPI
from contextlib import asynccontextmanager
import signal
import asyncio

health_service = HealthCheckService()
shutdown_event = asyncio.Event()  # Can be used to coordinate shutdown

async def handle_shutdown():
    """Handle shutdown gracefully in the correct order"""
    # Step 1: Mark as not ready (Kubernetes stops sending new traffic)
    health_service.request_shutdown()

    # Step 2: Wait for in-flight requests to complete
    # This should match the preStop hook delay in Kubernetes
    await asyncio.sleep(5)

    # Step 3: Close connections and release resources
    await cleanup_connections()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle with signal handling"""
    # Get the event loop for signal handling
    loop = asyncio.get_event_loop()

    # Register handlers for shutdown signals from Kubernetes
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(
            sig,
            lambda: asyncio.create_task(handle_shutdown())  # Non-blocking
        )

    # Initialize services during startup
    # ... initialize services ...
    health_service.set_startup_complete()

    yield  # Application runs here

    # Final cleanup when the app is shutting down
    await handle_shutdown()

app = FastAPI(lifespan=lifespan)

@app.get("/ready")
async def readiness(response: Response):
    """Readiness probe - returns 503 once shutdown begins"""
    result, status_code = await health_service.get_readiness()
    response.status_code = status_code
    return result
```

---

## Dependency Health Checks

### Database Health Check

This comprehensive database health check goes beyond simple connectivity. It measures response latency, checks connection pool utilization, and can flag degraded states when the pool is nearly exhausted.

```python
async def check_database_health(pool: asyncpg.Pool) -> ComponentHealth:
    """Comprehensive database health check with pool monitoring"""
    start = datetime.utcnow()

    try:
        # Acquire a connection and run a simple query
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")  # Minimal query to test connectivity

        # Calculate response latency
        latency = (datetime.utcnow() - start).total_seconds() * 1000

        # Check connection pool status for early warning signs
        pool_size = pool.get_size()  # Total connections in pool
        idle_size = pool.get_idle_size()  # Available connections

        # If pool is nearly exhausted, mark as degraded (not unhealthy)
        if idle_size < 2:
            return ComponentHealth(
                name="database",
                status=HealthStatus.DEGRADED,  # Still works, but under pressure
                message=f"Low idle connections: {idle_size}",
                latency_ms=latency,
                details={
                    "pool_size": pool_size,
                    "idle_size": idle_size
                }
            )

        # All good - database is healthy
        return ComponentHealth(
            name="database",
            status=HealthStatus.HEALTHY,
            latency_ms=latency,
            details={
                "pool_size": pool_size,
                "idle_size": idle_size
            }
        )

    except asyncio.TimeoutError:
        # Connection attempt timed out - definitely unhealthy
        return ComponentHealth(
            name="database",
            status=HealthStatus.UNHEALTHY,
            message="Connection timeout"
        )
    except Exception as e:
        # Any other error - log it and mark unhealthy
        return ComponentHealth(
            name="database",
            status=HealthStatus.UNHEALTHY,
            message=str(e)
        )
```

### Redis Health Check

The Redis health check uses the built-in PING command and optionally retrieves server information to provide useful metadata in the health response.

```python
async def check_redis_health(redis: aioredis.Redis) -> ComponentHealth:
    """Redis health check with latency and server info"""
    start = datetime.utcnow()

    try:
        await redis.ping()  # Built-in Redis connectivity check
        latency = (datetime.utcnow() - start).total_seconds() * 1000

        # Get additional Redis server info for diagnostics
        info = await redis.info("server")

        return ComponentHealth(
            name="redis",
            status=HealthStatus.HEALTHY,
            latency_ms=latency,
            details={
                "redis_version": info.get("redis_version"),  # Server version
                "connected_clients": info.get("connected_clients")  # Connection count
            }
        )
    except Exception as e:
        # Any Redis error means the cache is unavailable
        return ComponentHealth(
            name="redis",
            status=HealthStatus.UNHEALTHY,
            message=str(e)
        )
```

### External API Health Check

When your service depends on external APIs, you can check their availability as part of your readiness probe. This function checks the API's health endpoint and marks the component as degraded (not unhealthy) if the API returns a non-200 status.

```python
async def check_external_api(
    url: str,
    name: str,
    timeout: float = 5.0
) -> ComponentHealth:
    """Check external API availability with configurable timeout"""
    start = datetime.utcnow()

    try:
        # Use async HTTP client for non-blocking requests
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=timeout)
            latency = (datetime.utcnow() - start).total_seconds() * 1000

            if response.status_code == 200:
                # API is healthy
                return ComponentHealth(
                    name=name,
                    status=HealthStatus.HEALTHY,
                    latency_ms=latency
                )
            else:
                # API responded but with an error - mark as degraded
                return ComponentHealth(
                    name=name,
                    status=HealthStatus.DEGRADED,  # Not healthy, but reachable
                    message=f"Status code: {response.status_code}",
                    latency_ms=latency
                )

    except httpx.TimeoutException:
        # API didn't respond in time - definitely unhealthy
        return ComponentHealth(
            name=name,
            status=HealthStatus.UNHEALTHY,
            message="Request timeout"
        )
    except Exception as e:
        # Network error or other failure
        return ComponentHealth(
            name=name,
            status=HealthStatus.UNHEALTHY,
            message=str(e)
        )
```

---

## Best Practices

### 1. Keep Liveness Simple

```python
# GOOD: Simple liveness check
@app.get("/health")
async def health():
    return {"status": "healthy"}

# BAD: Checking dependencies in liveness
@app.get("/health")
async def health():
    await check_database()  # Don't do this!
    await check_redis()
    return {"status": "healthy"}
```

### 2. Use Startup Probes for Slow Apps

```yaml
# For applications that take time to start
startupProbe:
  httpGet:
    path: /startup
    port: 8000
  failureThreshold: 30
  periodSeconds: 10
# Allows up to 300 seconds for startup
```

### 3. Fail Readiness During Shutdown

```python
@app.get("/ready")
async def readiness(response: Response):
    if shutdown_in_progress:
        response.status_code = 503
        return {"status": "shutting_down"}
    # ... normal checks
```

### 4. Don't Cache Health Checks

```python
# GOOD: Fresh check every time
@app.get("/ready")
async def readiness():
    return await health_service.get_readiness()

# BAD: Cached result
@lru_cache(maxsize=1)  # Don't do this!
async def get_cached_health():
    return await check_all_services()
```

### 5. Set Appropriate Timeouts

```yaml
# Probe timeout should be less than period
livenessProbe:
  httpGet:
    path: /health
    port: 8000
  periodSeconds: 10
  timeoutSeconds: 5  # Must be < periodSeconds
```

---

## Conclusion

Proper health checks are essential for Kubernetes deployments. Key takeaways:

- **Liveness**: Keep it simple - just check if the process is alive
- **Readiness**: Check dependencies - return 503 if not ready for traffic
- **Startup**: Use for slow-starting applications
- **Graceful shutdown**: Fail readiness before stopping

With proper health checks, Kubernetes can make intelligent decisions about your pods.

---

*Need to monitor your Kubernetes health checks? [OneUptime](https://oneuptime.com) provides comprehensive monitoring with automatic health check tracking and alerting.*

**Related Reading:**
- [How to Build a Graceful Shutdown Handler in Python](https://oneuptime.com/blog/post/2025-01-06-python-graceful-shutdown-kubernetes/view)
- [Monitor Kubernetes Clusters with OpenTelemetry and OneUptime](https://oneuptime.com/blog/post/2025-11-14-monitor-kubernetes-clusters-with-opentelemetry-and-oneuptime/view)
