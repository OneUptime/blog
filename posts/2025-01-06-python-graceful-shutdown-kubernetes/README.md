# How to Build a Graceful Shutdown Handler in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Kubernetes, SIGTERM, Graceful Shutdown, DevOps, Reliability, Containers

Description: Learn how to implement graceful shutdown handlers in Python applications for Kubernetes deployments. This guide covers SIGTERM handling, connection draining, and ensuring zero-downtime deployments.

---

> In Kubernetes, pods are ephemeral. They're created, scaled, and terminated constantly. A graceful shutdown handler is what separates a smooth deployment from dropped requests and corrupted data. This guide shows you how to build bulletproof shutdown handling in Python.

When Kubernetes sends SIGTERM to your container, you have limited time (default 30 seconds) to finish in-flight requests and clean up resources. Without proper handling, active connections are severed mid-request, background jobs are interrupted, and data can be lost.

---

## Understanding the Kubernetes Shutdown Sequence

When a pod terminates, Kubernetes follows this sequence:

```
1. Pod marked for deletion
2. Endpoints removed (pod stops receiving new traffic)
3. PreStop hook executes (if defined)
4. SIGTERM sent to container
5. Grace period countdown (default 30s)
6. SIGKILL sent if process still running
```

Your application must handle SIGTERM and gracefully wind down within the grace period.

---

## Basic Signal Handling

### Simple SIGTERM Handler

```python
# basic_shutdown.py
import signal
import sys
import time

shutdown_requested = False

def handle_shutdown(signum, frame):
    """Handle SIGTERM signal"""
    global shutdown_requested
    print(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True

# Register signal handlers
signal.signal(signal.SIGTERM, handle_shutdown)
signal.signal(signal.SIGINT, handle_shutdown)  # For local Ctrl+C

def main():
    print("Application started")

    while not shutdown_requested:
        # Your application logic
        print("Processing...")
        time.sleep(1)

    print("Graceful shutdown complete")
    sys.exit(0)

if __name__ == "__main__":
    main()
```

### Using atexit for Cleanup

```python
# atexit_cleanup.py
import atexit
import signal
import sys

def cleanup():
    """Cleanup function called on exit"""
    print("Performing cleanup...")
    # Close database connections
    # Flush buffers
    # Release resources
    print("Cleanup complete")

# Register cleanup function
atexit.register(cleanup)

def handle_signal(signum, frame):
    """Handle termination signals"""
    print(f"Received signal {signum}")
    sys.exit(0)  # This triggers atexit handlers

signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)
```

---

## GracefulShutdown Class

A reusable class for managing graceful shutdown:

```python
# graceful_shutdown.py
import signal
import threading
import logging
from typing import Callable, List, Optional
from dataclasses import dataclass, field
from contextlib import contextmanager
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ShutdownHandler:
    """Handler for graceful application shutdown"""

    name: str
    handler: Callable
    timeout: float = 10.0
    priority: int = 0  # Higher priority runs first

class GracefulShutdown:
    """Manages graceful shutdown of application components"""

    def __init__(self, grace_period: float = 30.0):
        self.grace_period = grace_period
        self._shutdown_event = threading.Event()
        self._handlers: List[ShutdownHandler] = []
        self._in_flight_requests = 0
        self._requests_lock = threading.Lock()
        self._setup_signals()

    def _setup_signals(self):
        """Register signal handlers"""
        signal.signal(signal.SIGTERM, self._signal_handler)
        signal.signal(signal.SIGINT, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        signal_name = signal.Signals(signum).name
        logger.info(f"Received {signal_name}, initiating graceful shutdown")
        self._shutdown_event.set()

    @property
    def is_shutting_down(self) -> bool:
        """Check if shutdown has been requested"""
        return self._shutdown_event.is_set()

    def register_handler(
        self,
        name: str,
        handler: Callable,
        timeout: float = 10.0,
        priority: int = 0
    ):
        """Register a shutdown handler"""
        self._handlers.append(ShutdownHandler(
            name=name,
            handler=handler,
            timeout=timeout,
            priority=priority
        ))
        logger.debug(f"Registered shutdown handler: {name}")

    @contextmanager
    def track_request(self):
        """Context manager to track in-flight requests"""
        with self._requests_lock:
            self._in_flight_requests += 1

        try:
            yield
        finally:
            with self._requests_lock:
                self._in_flight_requests -= 1

    def get_in_flight_count(self) -> int:
        """Get number of in-flight requests"""
        with self._requests_lock:
            return self._in_flight_requests

    def wait_for_shutdown(self, check_interval: float = 0.1):
        """Block until shutdown signal received"""
        while not self._shutdown_event.is_set():
            self._shutdown_event.wait(timeout=check_interval)

    def wait_for_requests(self, timeout: float = None) -> bool:
        """Wait for all in-flight requests to complete"""
        timeout = timeout or self.grace_period
        start_time = time.time()

        while self.get_in_flight_count() > 0:
            elapsed = time.time() - start_time
            if elapsed >= timeout:
                logger.warning(
                    f"Timeout waiting for requests, "
                    f"{self.get_in_flight_count()} still in flight"
                )
                return False
            time.sleep(0.1)

        return True

    def execute_handlers(self):
        """Execute all registered shutdown handlers"""
        # Sort by priority (higher first)
        handlers = sorted(
            self._handlers,
            key=lambda h: h.priority,
            reverse=True
        )

        for handler in handlers:
            try:
                logger.info(f"Executing shutdown handler: {handler.name}")
                # Run with timeout
                result = self._run_with_timeout(
                    handler.handler,
                    handler.timeout
                )
                if result:
                    logger.info(f"Handler {handler.name} completed")
                else:
                    logger.warning(f"Handler {handler.name} timed out")
            except Exception as e:
                logger.error(f"Handler {handler.name} failed: {e}")

    def _run_with_timeout(self, func: Callable, timeout: float) -> bool:
        """Run a function with a timeout"""
        result = [False]

        def target():
            func()
            result[0] = True

        thread = threading.Thread(target=target)
        thread.start()
        thread.join(timeout=timeout)

        return result[0]

    def shutdown(self):
        """Execute the full shutdown sequence"""
        logger.info("Starting graceful shutdown sequence")

        # 1. Stop accepting new requests (handled by middleware)
        logger.info("Stopping acceptance of new requests")

        # 2. Wait for in-flight requests
        logger.info(f"Waiting for {self.get_in_flight_count()} in-flight requests")
        self.wait_for_requests(timeout=self.grace_period * 0.5)

        # 3. Execute shutdown handlers
        logger.info("Executing shutdown handlers")
        self.execute_handlers()

        logger.info("Graceful shutdown complete")

# Global instance
shutdown_manager = GracefulShutdown()
```

---

## Flask Integration

### Flask with Graceful Shutdown

```python
# flask_graceful.py
from flask import Flask, request, jsonify, g
from graceful_shutdown import shutdown_manager
import logging
import time
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Database connection (example)
class DatabaseConnection:
    def __init__(self):
        self.connected = True

    def close(self):
        logger.info("Closing database connection")
        self.connected = False

db = DatabaseConnection()

# Background worker
class BackgroundWorker:
    def __init__(self):
        self._running = True
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        while self._running:
            logger.debug("Background worker tick")
            time.sleep(1)
        logger.info("Background worker stopped")

    def stop(self):
        self._running = False
        self._thread.join(timeout=5)

worker = BackgroundWorker()

# Register shutdown handlers
shutdown_manager.register_handler(
    name="database",
    handler=db.close,
    timeout=5.0,
    priority=10  # Close DB last
)

shutdown_manager.register_handler(
    name="background_worker",
    handler=worker.stop,
    timeout=10.0,
    priority=20  # Stop worker before DB
)

@app.before_request
def before_request():
    """Check if shutting down and track requests"""
    if shutdown_manager.is_shutting_down:
        return jsonify({"error": "Service shutting down"}), 503

    g.request_tracker = shutdown_manager.track_request()
    g.request_tracker.__enter__()

@app.after_request
def after_request(response):
    """Complete request tracking"""
    if hasattr(g, 'request_tracker'):
        g.request_tracker.__exit__(None, None, None)
    return response

@app.route('/api/process')
def process():
    """Simulates a slow endpoint"""
    time.sleep(2)  # Simulate processing
    return jsonify({"status": "processed"})

@app.route('/health')
def health():
    """Health check endpoint"""
    if shutdown_manager.is_shutting_down:
        return jsonify({"status": "shutting_down"}), 503
    return jsonify({"status": "healthy"})

@app.route('/ready')
def ready():
    """Readiness check endpoint"""
    if shutdown_manager.is_shutting_down:
        return jsonify({"status": "not_ready"}), 503
    return jsonify({"status": "ready"})

def run_server():
    """Run the Flask server with shutdown handling"""
    from werkzeug.serving import make_server

    server = make_server('0.0.0.0', 5000, app, threaded=True)

    # Register server shutdown
    shutdown_manager.register_handler(
        name="http_server",
        handler=server.shutdown,
        timeout=5.0,
        priority=30  # Stop server first
    )

    # Start server in thread
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.start()

    logger.info("Server started on port 5000")

    # Wait for shutdown signal
    shutdown_manager.wait_for_shutdown()

    # Execute shutdown
    shutdown_manager.shutdown()

    # Wait for server thread
    server_thread.join(timeout=5)

if __name__ == '__main__':
    run_server()
```

---

## FastAPI Integration

### FastAPI with Lifespan Events

```python
# fastapi_graceful.py
from fastapi import FastAPI, Request, HTTPException
from contextlib import asynccontextmanager
import asyncio
import signal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GracefulShutdownManager:
    """Async-aware shutdown manager for FastAPI"""

    def __init__(self):
        self._shutdown_event = asyncio.Event()
        self._in_flight = 0
        self._lock = asyncio.Lock()
        self._handlers = []

    @property
    def is_shutting_down(self) -> bool:
        return self._shutdown_event.is_set()

    def trigger_shutdown(self):
        self._shutdown_event.set()

    async def track_request(self):
        """Context manager for tracking requests"""
        async with self._lock:
            self._in_flight += 1
        try:
            yield
        finally:
            async with self._lock:
                self._in_flight -= 1

    async def wait_for_requests(self, timeout: float = 30):
        """Wait for all requests to complete"""
        start = asyncio.get_event_loop().time()
        while True:
            async with self._lock:
                if self._in_flight == 0:
                    return True
            if asyncio.get_event_loop().time() - start > timeout:
                logger.warning(f"Timeout: {self._in_flight} requests still in flight")
                return False
            await asyncio.sleep(0.1)

    def register_handler(self, name: str, handler, priority: int = 0):
        self._handlers.append((priority, name, handler))

    async def execute_handlers(self):
        """Execute shutdown handlers in priority order"""
        handlers = sorted(self._handlers, key=lambda x: x[0], reverse=True)
        for priority, name, handler in handlers:
            try:
                logger.info(f"Executing handler: {name}")
                if asyncio.iscoroutinefunction(handler):
                    await handler()
                else:
                    handler()
            except Exception as e:
                logger.error(f"Handler {name} failed: {e}")

shutdown_manager = GracefulShutdownManager()

# Simulated resources
class Database:
    async def connect(self):
        logger.info("Database connected")

    async def disconnect(self):
        logger.info("Database disconnecting...")
        await asyncio.sleep(0.5)
        logger.info("Database disconnected")

class RedisClient:
    async def connect(self):
        logger.info("Redis connected")

    async def disconnect(self):
        logger.info("Redis disconnecting...")
        await asyncio.sleep(0.2)
        logger.info("Redis disconnected")

db = Database()
redis = RedisClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    # Startup
    logger.info("Application starting...")
    await db.connect()
    await redis.connect()

    # Register shutdown handlers
    shutdown_manager.register_handler("redis", redis.disconnect, priority=20)
    shutdown_manager.register_handler("database", db.disconnect, priority=10)

    # Setup signal handlers
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(
            sig,
            lambda s=sig: asyncio.create_task(handle_signal(s))
        )

    logger.info("Application started")

    yield

    # Shutdown
    logger.info("Application shutting down...")
    await shutdown_manager.wait_for_requests(timeout=25)
    await shutdown_manager.execute_handlers()
    logger.info("Application shutdown complete")

async def handle_signal(sig):
    """Handle shutdown signals"""
    logger.info(f"Received signal {sig.name}")
    shutdown_manager.trigger_shutdown()

app = FastAPI(lifespan=lifespan)

@app.middleware("http")
async def shutdown_middleware(request: Request, call_next):
    """Middleware to handle shutdown state"""
    if shutdown_manager.is_shutting_down:
        raise HTTPException(status_code=503, detail="Service shutting down")

    async for _ in shutdown_manager.track_request():
        response = await call_next(request)
        return response

@app.get("/api/slow")
async def slow_endpoint():
    """Simulates a slow endpoint"""
    await asyncio.sleep(5)
    return {"status": "completed"}

@app.get("/health")
async def health():
    if shutdown_manager.is_shutting_down:
        raise HTTPException(status_code=503, detail="Shutting down")
    return {"status": "healthy"}

@app.get("/ready")
async def ready():
    if shutdown_manager.is_shutting_down:
        raise HTTPException(status_code=503, detail="Not ready")
    return {"status": "ready"}
```

---

## Celery Worker Shutdown

### Graceful Celery Shutdown

```python
# celery_graceful.py
from celery import Celery
from celery.signals import worker_shutting_down, worker_shutdown
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Celery('tasks', broker='redis://localhost:6379/0')

# Track active tasks
active_tasks = set()

@worker_shutting_down.connect
def handle_worker_shutting_down(sig, how, exitcode, **kwargs):
    """Called when worker receives shutdown signal"""
    logger.info(f"Worker shutting down (signal={sig}, how={how})")
    logger.info(f"Active tasks: {len(active_tasks)}")

@worker_shutdown.connect
def handle_worker_shutdown(**kwargs):
    """Called when worker has shut down"""
    logger.info("Worker shutdown complete")

@app.task(bind=True)
def long_running_task(self, duration: int):
    """A task that takes time to complete"""
    task_id = self.request.id
    active_tasks.add(task_id)

    try:
        logger.info(f"Task {task_id} started, duration={duration}s")

        # Check for revocation periodically
        for i in range(duration):
            if self.is_aborted():
                logger.warning(f"Task {task_id} aborted")
                return {"status": "aborted"}
            time.sleep(1)
            logger.debug(f"Task {task_id} progress: {i+1}/{duration}")

        logger.info(f"Task {task_id} completed")
        return {"status": "completed"}

    finally:
        active_tasks.discard(task_id)

@app.task(bind=True, acks_late=True)
def retriable_task(self, data):
    """
    Task with acks_late for reliability.
    If worker dies, task will be redelivered.
    """
    try:
        process_data(data)
    except Exception as e:
        logger.error(f"Task failed: {e}")
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
```

### Celery Configuration for Graceful Shutdown

```python
# celeryconfig.py
from kombu import Queue

# Basic settings
broker_url = 'redis://localhost:6379/0'
result_backend = 'redis://localhost:6379/0'

# Acknowledgment settings
task_acks_late = True  # Acknowledge after task completes
task_reject_on_worker_lost = True  # Reject if worker dies

# Prefetch settings
worker_prefetch_multiplier = 1  # Fetch one task at a time

# Timeout settings
task_soft_time_limit = 300  # 5 minute soft limit
task_time_limit = 600  # 10 minute hard limit

# Shutdown settings
worker_max_tasks_per_child = 1000  # Restart worker after N tasks
worker_max_memory_per_child = 200000  # 200MB

# Queues
task_queues = (
    Queue('default', routing_key='default'),
    Queue('high_priority', routing_key='high'),
    Queue('low_priority', routing_key='low'),
)

task_default_queue = 'default'
task_default_routing_key = 'default'
```

---

## Kubernetes Configuration

### Deployment with Graceful Shutdown

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
      terminationGracePeriodSeconds: 60  # Match your app's needs
      containers:
      - name: api
        image: python-api:latest
        ports:
        - containerPort: 8000

        # Probes
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 10

        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5

        # Lifecycle hooks
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - "sleep 5"  # Allow time for endpoints to be removed

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Pod Disruption Budget

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: python-api-pdb
spec:
  minAvailable: 2  # Or use maxUnavailable: 1
  selector:
    matchLabels:
      app: python-api
```

---

## Health Check Endpoints

### Comprehensive Health Checks

```python
# health_checks.py
from fastapi import FastAPI, HTTPException
from enum import Enum
from dataclasses import dataclass
from typing import Dict, Optional
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

class HealthChecker:
    """Manages health checks for all components"""

    def __init__(self):
        self._checks = {}
        self._shutdown_requested = False

    def request_shutdown(self):
        self._shutdown_requested = True

    def register_check(self, name: str, check_func):
        self._checks[name] = check_func

    async def check_component(self, name: str, check_func) -> ComponentHealth:
        """Run a health check with timeout"""
        import time
        start = time.time()
        try:
            if asyncio.iscoroutinefunction(check_func):
                result = await asyncio.wait_for(check_func(), timeout=5.0)
            else:
                result = check_func()

            latency = (time.time() - start) * 1000
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

    async def get_health(self) -> Dict:
        """Get overall health status"""
        results = []
        for name, check in self._checks.items():
            result = await self.check_component(name, check)
            results.append(result)

        # Determine overall status
        if any(r.status == HealthStatus.UNHEALTHY for r in results):
            overall = HealthStatus.UNHEALTHY
        elif any(r.status == HealthStatus.DEGRADED for r in results):
            overall = HealthStatus.DEGRADED
        else:
            overall = HealthStatus.HEALTHY

        return {
            "status": overall.value,
            "components": [
                {
                    "name": r.name,
                    "status": r.status.value,
                    "message": r.message,
                    "latency_ms": r.latency_ms
                }
                for r in results
            ]
        }

    def is_ready(self) -> bool:
        """Check if service is ready to accept traffic"""
        return not self._shutdown_requested

# Usage
health_checker = HealthChecker()

# Register checks
async def check_database():
    # Check database connection
    return True

async def check_redis():
    # Check Redis connection
    return True

health_checker.register_check("database", check_database)
health_checker.register_check("redis", check_redis)

app = FastAPI()

@app.get("/health")
async def health():
    """Liveness probe - is the process running?"""
    return await health_checker.get_health()

@app.get("/ready")
async def ready():
    """Readiness probe - should we receive traffic?"""
    if not health_checker.is_ready():
        raise HTTPException(status_code=503, detail="Not ready")

    health = await health_checker.get_health()
    if health["status"] == "unhealthy":
        raise HTTPException(status_code=503, detail=health)

    return health
```

---

## Best Practices

### 1. Align Grace Periods

```yaml
# Kubernetes terminationGracePeriodSeconds should be:
# preStop delay + max request time + cleanup time + buffer
terminationGracePeriodSeconds: 60  # 5s preStop + 30s requests + 20s cleanup + 5s buffer
```

### 2. Return 503 During Shutdown

```python
if shutdown_manager.is_shutting_down:
    return jsonify({"error": "Service shutting down"}), 503
```

### 3. Wait for In-Flight Requests

```python
# Don't exit until requests complete
await shutdown_manager.wait_for_requests(timeout=25)
```

### 4. Order Shutdown Operations

```python
# Stop accepting traffic first, close database last
shutdown_manager.register_handler("http_server", stop_server, priority=30)
shutdown_manager.register_handler("background_jobs", stop_jobs, priority=20)
shutdown_manager.register_handler("database", close_db, priority=10)
```

### 5. Use PreStop Hooks

```yaml
lifecycle:
  preStop:
    exec:
      command: ["sleep", "5"]  # Allow endpoints to be removed
```

---

## Conclusion

Graceful shutdown handling is essential for reliable Kubernetes deployments. Key takeaways:

- **Handle SIGTERM** - Kubernetes sends this before SIGKILL
- **Track in-flight requests** - Don't exit with active connections
- **Order shutdown operations** - Stop accepting traffic first
- **Set appropriate timeouts** - Align with terminationGracePeriodSeconds
- **Use health checks** - Return 503 when shutting down

With proper graceful shutdown handling, your deployments will be smooth and your users won't notice when pods are recycled.

---

*Need to monitor your Kubernetes deployments? [OneUptime](https://oneuptime.com) provides comprehensive Kubernetes monitoring with pod health tracking, deployment status, and automatic incident detection.*

**Related Reading:**
- [Build Health Checks and Readiness Probes in Python for Kubernetes](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [Monitor Kubernetes Clusters with OpenTelemetry and OneUptime](https://oneuptime.com/blog/post/2025-11-14-monitor-kubernetes-clusters-with-opentelemetry-and-oneuptime/view)
