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

```python
# health_checks.py
from fastapi import FastAPI, Response, status
from datetime import datetime
import asyncio

app = FastAPI()

# Startup time tracking
startup_time = datetime.utcnow()
ready = False

@app.on_event("startup")
async def startup():
    global ready
    # Simulate initialization (DB connections, cache warming, etc.)
    await initialize_services()
    ready = True

@app.get("/health")
async def health_check():
    """
    Liveness probe - is the process alive?
    Should return 200 if the process is running.
    Keep this simple - don't check external dependencies here.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/ready")
async def readiness_check(response: Response):
    """
    Readiness probe - can we handle traffic?
    Should check if the application is ready to serve requests.
    """
    if not ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {
            "status": "not_ready",
            "reason": "Service is starting up"
        }

    return {
        "status": "ready",
        "uptime_seconds": (datetime.utcnow() - startup_time).total_seconds()
    }
```

### Flask Implementation

```python
# flask_health.py
from flask import Flask, jsonify
from datetime import datetime

app = Flask(__name__)

startup_time = datetime.utcnow()
ready = False

@app.before_first_request
def initialize():
    global ready
    # Initialize services
    ready = True

@app.route('/health')
def health():
    """Liveness probe"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    })

@app.route('/ready')
def ready_check():
    """Readiness probe"""
    if not ready:
        return jsonify({
            "status": "not_ready",
            "reason": "Initializing"
        }), 503

    return jsonify({
        "status": "ready",
        "uptime": str(datetime.utcnow() - startup_time)
    })
```

---

## Comprehensive Health Check Service

```python
# health_service.py
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Callable, Awaitable
from datetime import datetime
import asyncio

class HealthStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"

@dataclass
class ComponentHealth:
    name: str
    status: HealthStatus
    message: Optional[str] = None
    latency_ms: Optional[float] = None
    details: Optional[Dict] = None

class HealthCheckService:
    """Comprehensive health check management"""

    def __init__(self):
        self._checks: Dict[str, Callable] = {}
        self._shutdown_requested = False
        self._startup_complete = False

    def register_check(self, name: str, check: Callable[[], Awaitable[bool]]):
        """Register a health check function"""
        self._checks[name] = check

    def set_startup_complete(self):
        """Mark startup as complete"""
        self._startup_complete = True

    def request_shutdown(self):
        """Mark service as shutting down"""
        self._shutdown_requested = True

    async def check_component(
        self,
        name: str,
        check: Callable
    ) -> ComponentHealth:
        """Run a single health check with timeout"""
        start = datetime.utcnow()

        try:
            result = await asyncio.wait_for(check(), timeout=5.0)
            latency = (datetime.utcnow() - start).total_seconds() * 1000

            return ComponentHealth(
                name=name,
                status=HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY,
                latency_ms=latency
            )
        except asyncio.TimeoutError:
            return ComponentHealth(
                name=name,
                status=HealthStatus.UNHEALTHY,
                message="Health check timeout"
            )
        except Exception as e:
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
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat()
        }

    async def get_readiness(self) -> tuple[Dict, int]:
        """
        Readiness check - can we handle traffic?
        Checks all registered components.
        """
        if self._shutdown_requested:
            return {
                "status": "not_ready",
                "reason": "Shutdown in progress"
            }, 503

        if not self._startup_complete:
            return {
                "status": "not_ready",
                "reason": "Startup in progress"
            }, 503

        # Check all components
        results = []
        for name, check in self._checks.items():
            result = await self.check_component(name, check)
            results.append(result)

        # Determine overall status
        unhealthy = [r for r in results if r.status == HealthStatus.UNHEALTHY]
        degraded = [r for r in results if r.status == HealthStatus.DEGRADED]

        if unhealthy:
            return {
                "status": "not_ready",
                "unhealthy_components": [r.name for r in unhealthy],
                "components": [self._serialize_component(r) for r in results]
            }, 503
        elif degraded:
            return {
                "status": "degraded",
                "degraded_components": [r.name for r in degraded],
                "components": [self._serialize_component(r) for r in results]
            }, 200
        else:
            return {
                "status": "ready",
                "components": [self._serialize_component(r) for r in results]
            }, 200

    async def get_startup(self) -> tuple[Dict, int]:
        """
        Startup check - has the application finished starting?
        """
        if self._startup_complete:
            return {"status": "started"}, 200
        else:
            return {"status": "starting"}, 503

    def _serialize_component(self, component: ComponentHealth) -> Dict:
        return {
            "name": component.name,
            "status": component.status.value,
            "message": component.message,
            "latency_ms": component.latency_ms
        }
```

---

## FastAPI Integration with Dependencies

```python
# fastapi_health.py
from fastapi import FastAPI, Response, Depends
from contextlib import asynccontextmanager
import asyncpg
import aioredis

# Initialize health service
health_service = HealthCheckService()

# Database pool
db_pool: asyncpg.Pool = None
redis_client: aioredis.Redis = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool, redis_client

    # Startup
    db_pool = await asyncpg.create_pool(
        "postgresql://localhost/mydb",
        min_size=5,
        max_size=20
    )

    redis_client = await aioredis.from_url("redis://localhost")

    # Register health checks
    health_service.register_check("database", check_database)
    health_service.register_check("redis", check_redis)

    # Mark startup complete
    health_service.set_startup_complete()

    yield

    # Shutdown
    health_service.request_shutdown()
    await db_pool.close()
    await redis_client.close()

app = FastAPI(lifespan=lifespan)

async def check_database() -> bool:
    """Check database connectivity"""
    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        return True
    except Exception:
        return False

async def check_redis() -> bool:
    """Check Redis connectivity"""
    try:
        await redis_client.ping()
        return True
    except Exception:
        return False

@app.get("/health")
async def liveness():
    """Liveness probe - Kubernetes uses this to know if it should restart"""
    return await health_service.get_liveness()

@app.get("/ready")
async def readiness(response: Response):
    """Readiness probe - Kubernetes uses this to know if it should send traffic"""
    result, status_code = await health_service.get_readiness()
    response.status_code = status_code
    return result

@app.get("/startup")
async def startup(response: Response):
    """Startup probe - Kubernetes uses this during initial startup"""
    result, status_code = await health_service.get_startup()
    response.status_code = status_code
    return result

@app.get("/health/detailed")
async def detailed_health(response: Response):
    """Detailed health check for debugging (not for probes)"""
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

```python
# graceful_shutdown.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
import signal
import asyncio

health_service = HealthCheckService()
shutdown_event = asyncio.Event()

async def handle_shutdown():
    """Handle shutdown gracefully"""
    # 1. Mark as not ready (stop receiving traffic)
    health_service.request_shutdown()

    # 2. Wait for in-flight requests (Kubernetes gives us time)
    await asyncio.sleep(5)  # Match preStop hook

    # 3. Close connections
    await cleanup_connections()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    loop = asyncio.get_event_loop()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(
            sig,
            lambda: asyncio.create_task(handle_shutdown())
        )

    # ... initialize services ...
    health_service.set_startup_complete()

    yield

    # Shutdown
    await handle_shutdown()

app = FastAPI(lifespan=lifespan)

@app.get("/ready")
async def readiness(response: Response):
    # Will return 503 when shutdown is requested
    result, status_code = await health_service.get_readiness()
    response.status_code = status_code
    return result
```

---

## Dependency Health Checks

### Database Health Check

```python
async def check_database_health(pool: asyncpg.Pool) -> ComponentHealth:
    """Comprehensive database health check"""
    start = datetime.utcnow()

    try:
        async with pool.acquire() as conn:
            # Simple connectivity check
            await conn.fetchval("SELECT 1")

        latency = (datetime.utcnow() - start).total_seconds() * 1000

        # Check pool status
        pool_size = pool.get_size()
        idle_size = pool.get_idle_size()

        # Warn if pool is nearly exhausted
        if idle_size < 2:
            return ComponentHealth(
                name="database",
                status=HealthStatus.DEGRADED,
                message=f"Low idle connections: {idle_size}",
                latency_ms=latency,
                details={
                    "pool_size": pool_size,
                    "idle_size": idle_size
                }
            )

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
        return ComponentHealth(
            name="database",
            status=HealthStatus.UNHEALTHY,
            message="Connection timeout"
        )
    except Exception as e:
        return ComponentHealth(
            name="database",
            status=HealthStatus.UNHEALTHY,
            message=str(e)
        )
```

### Redis Health Check

```python
async def check_redis_health(redis: aioredis.Redis) -> ComponentHealth:
    """Redis health check with latency"""
    start = datetime.utcnow()

    try:
        await redis.ping()
        latency = (datetime.utcnow() - start).total_seconds() * 1000

        # Get Redis info
        info = await redis.info("server")

        return ComponentHealth(
            name="redis",
            status=HealthStatus.HEALTHY,
            latency_ms=latency,
            details={
                "redis_version": info.get("redis_version"),
                "connected_clients": info.get("connected_clients")
            }
        )
    except Exception as e:
        return ComponentHealth(
            name="redis",
            status=HealthStatus.UNHEALTHY,
            message=str(e)
        )
```

### External API Health Check

```python
async def check_external_api(
    url: str,
    name: str,
    timeout: float = 5.0
) -> ComponentHealth:
    """Check external API health"""
    start = datetime.utcnow()

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=timeout)
            latency = (datetime.utcnow() - start).total_seconds() * 1000

            if response.status_code == 200:
                return ComponentHealth(
                    name=name,
                    status=HealthStatus.HEALTHY,
                    latency_ms=latency
                )
            else:
                return ComponentHealth(
                    name=name,
                    status=HealthStatus.DEGRADED,
                    message=f"Status code: {response.status_code}",
                    latency_ms=latency
                )

    except httpx.TimeoutException:
        return ComponentHealth(
            name=name,
            status=HealthStatus.UNHEALTHY,
            message="Request timeout"
        )
    except Exception as e:
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
