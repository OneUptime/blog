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

This example demonstrates the fundamental pattern for catching SIGTERM signals sent by Kubernetes. The handler sets a flag that the main loop checks, allowing work to complete gracefully before exiting.

```python
# basic_shutdown.py
# Basic signal handling for graceful shutdown in Kubernetes
import signal
import sys
import time

# Global flag to track shutdown state - checked by the main loop
shutdown_requested = False

def handle_shutdown(signum, frame):
    """Handle SIGTERM signal from Kubernetes or SIGINT from Ctrl+C"""
    global shutdown_requested
    print(f"Received signal {signum}, initiating graceful shutdown...")
    shutdown_requested = True  # Signal main loop to stop

# Register signal handlers before starting any work
signal.signal(signal.SIGTERM, handle_shutdown)  # Kubernetes sends this
signal.signal(signal.SIGINT, handle_shutdown)   # Local Ctrl+C for testing

def main():
    print("Application started")

    # Main processing loop - continues until shutdown is requested
    while not shutdown_requested:
        # Your application logic goes here
        print("Processing...")
        time.sleep(1)  # Simulate work

    # Clean exit after loop completes
    print("Graceful shutdown complete")
    sys.exit(0)  # Exit with success code

if __name__ == "__main__":
    main()
```

### Using atexit for Cleanup

Python's `atexit` module provides a way to register cleanup functions that run automatically when the program exits. This ensures resources are released even if you forget to call cleanup explicitly.

```python
# atexit_cleanup.py
# Automatic cleanup using Python's atexit module
import atexit
import signal
import sys

def cleanup():
    """Cleanup function called automatically on exit"""
    print("Performing cleanup...")
    # Close database connections
    # Flush buffers
    # Release resources
    print("Cleanup complete")

# Register cleanup function - will run on normal exit or sys.exit()
atexit.register(cleanup)

def handle_signal(signum, frame):
    """Handle termination signals by triggering clean exit"""
    print(f"Received signal {signum}")
    sys.exit(0)  # This triggers atexit handlers automatically

# Register handlers for both SIGTERM and SIGINT
signal.signal(signal.SIGTERM, handle_signal)
signal.signal(signal.SIGINT, handle_signal)
```

---

## GracefulShutdown Class

This reusable class encapsulates all the logic needed for production-grade graceful shutdown. It tracks in-flight requests, manages multiple shutdown handlers with priorities, and coordinates the shutdown sequence.

```python
# graceful_shutdown.py
# Production-ready graceful shutdown manager for Kubernetes deployments
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
    """Configuration for a single shutdown handler"""
    name: str              # Descriptive name for logging
    handler: Callable      # Function to call during shutdown
    timeout: float = 10.0  # Max time to wait for handler
    priority: int = 0      # Higher priority runs first (e.g., 30=HTTP, 10=DB)

class GracefulShutdown:
    """Manages graceful shutdown of application components"""

    def __init__(self, grace_period: float = 30.0):
        # Total time allowed for shutdown (match K8s terminationGracePeriodSeconds)
        self.grace_period = grace_period
        # Event to signal shutdown has been requested
        self._shutdown_event = threading.Event()
        # List of registered cleanup handlers
        self._handlers: List[ShutdownHandler] = []
        # Counter for active requests (thread-safe)
        self._in_flight_requests = 0
        self._requests_lock = threading.Lock()
        # Register signal handlers on initialization
        self._setup_signals()

    def _setup_signals(self):
        """Register handlers for termination signals"""
        signal.signal(signal.SIGTERM, self._signal_handler)  # K8s shutdown
        signal.signal(signal.SIGINT, self._signal_handler)   # Ctrl+C

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals by setting the shutdown event"""
        signal_name = signal.Signals(signum).name
        logger.info(f"Received {signal_name}, initiating graceful shutdown")
        self._shutdown_event.set()  # Wake up any waiting threads

    @property
    def is_shutting_down(self) -> bool:
        """Check if shutdown has been requested - use in request handlers"""
        return self._shutdown_event.is_set()

    def register_handler(
        self,
        name: str,
        handler: Callable,
        timeout: float = 10.0,
        priority: int = 0
    ):
        """Register a shutdown handler with priority ordering"""
        self._handlers.append(ShutdownHandler(
            name=name,
            handler=handler,
            timeout=timeout,
            priority=priority
        ))
        logger.debug(f"Registered shutdown handler: {name}")

    @contextmanager
    def track_request(self):
        """Context manager to track in-flight requests for connection draining"""
        # Increment counter when request starts
        with self._requests_lock:
            self._in_flight_requests += 1
        try:
            yield  # Request processing happens here
        finally:
            # Decrement counter when request completes (or fails)
            with self._requests_lock:
                self._in_flight_requests -= 1

    def get_in_flight_count(self) -> int:
        """Get number of currently active requests (thread-safe)"""
        with self._requests_lock:
            return self._in_flight_requests

    def wait_for_shutdown(self, check_interval: float = 0.1):
        """Block until shutdown signal received - use in main thread"""
        while not self._shutdown_event.is_set():
            self._shutdown_event.wait(timeout=check_interval)

    def wait_for_requests(self, timeout: float = None) -> bool:
        """Wait for all in-flight requests to complete (connection draining)"""
        timeout = timeout or self.grace_period
        start_time = time.time()

        # Poll until no requests or timeout
        while self.get_in_flight_count() > 0:
            elapsed = time.time() - start_time
            if elapsed >= timeout:
                logger.warning(
                    f"Timeout waiting for requests, "
                    f"{self.get_in_flight_count()} still in flight"
                )
                return False  # Timeout - some requests didn't complete
            time.sleep(0.1)

        return True  # All requests completed

    def execute_handlers(self):
        """Execute all registered shutdown handlers in priority order"""
        # Sort by priority descending (higher priority first)
        handlers = sorted(
            self._handlers,
            key=lambda h: h.priority,
            reverse=True
        )

        for handler in handlers:
            try:
                logger.info(f"Executing shutdown handler: {handler.name}")
                # Run with timeout to prevent hanging
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
        """Run a function with a timeout using a separate thread"""
        result = [False]

        def target():
            func()
            result[0] = True

        thread = threading.Thread(target=target)
        thread.start()
        thread.join(timeout=timeout)  # Wait up to timeout seconds

        return result[0]  # True if completed, False if timed out

    def shutdown(self):
        """Execute the full shutdown sequence in correct order"""
        logger.info("Starting graceful shutdown sequence")

        # Step 1: Stop accepting new requests (handled by middleware returning 503)
        logger.info("Stopping acceptance of new requests")

        # Step 2: Wait for in-flight requests to complete (connection draining)
        logger.info(f"Waiting for {self.get_in_flight_count()} in-flight requests")
        self.wait_for_requests(timeout=self.grace_period * 0.5)

        # Step 3: Execute shutdown handlers (close DB, stop workers, etc.)
        logger.info("Executing shutdown handlers")
        self.execute_handlers()

        logger.info("Graceful shutdown complete")

# Global singleton instance - import this in your application
shutdown_manager = GracefulShutdown()
```

---

## Flask Integration

### Flask with Graceful Shutdown

This example shows how to integrate the GracefulShutdown class with Flask. It demonstrates request tracking, health check endpoints that return 503 during shutdown, and proper handler registration with priorities.

```python
# flask_graceful.py
# Flask application with graceful shutdown support for Kubernetes
from flask import Flask, request, jsonify, g
from graceful_shutdown import shutdown_manager
import logging
import time
import threading

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Example database connection class
class DatabaseConnection:
    def __init__(self):
        self.connected = True

    def close(self):
        """Close database connection gracefully"""
        logger.info("Closing database connection")
        self.connected = False

db = DatabaseConnection()

# Example background worker that needs graceful stopping
class BackgroundWorker:
    def __init__(self):
        self._running = True
        # Daemon thread so it doesn't block exit
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def _run(self):
        """Background processing loop"""
        while self._running:
            logger.debug("Background worker tick")
            time.sleep(1)
        logger.info("Background worker stopped")

    def stop(self):
        """Stop the worker and wait for thread to finish"""
        self._running = False
        self._thread.join(timeout=5)

worker = BackgroundWorker()

# Register shutdown handlers with priorities (higher = runs first)
# Priority order: HTTP server (30) -> Workers (20) -> Database (10)
shutdown_manager.register_handler(
    name="database",
    handler=db.close,
    timeout=5.0,
    priority=10  # Close DB last (after workers finish)
)

shutdown_manager.register_handler(
    name="background_worker",
    handler=worker.stop,
    timeout=10.0,
    priority=20  # Stop worker before closing DB
)

@app.before_request
def before_request():
    """Check shutdown status and track requests for connection draining"""
    # Reject new requests during shutdown with 503
    if shutdown_manager.is_shutting_down:
        return jsonify({"error": "Service shutting down"}), 503

    # Track this request for graceful shutdown
    g.request_tracker = shutdown_manager.track_request()
    g.request_tracker.__enter__()

@app.after_request
def after_request(response):
    """Complete request tracking after response is ready"""
    if hasattr(g, 'request_tracker'):
        g.request_tracker.__exit__(None, None, None)
    return response

@app.route('/api/process')
def process():
    """Example slow endpoint - demonstrates request tracking"""
    time.sleep(2)  # Simulate processing time
    return jsonify({"status": "processed"})

@app.route('/health')
def health():
    """Liveness probe - return 503 during shutdown"""
    if shutdown_manager.is_shutting_down:
        return jsonify({"status": "shutting_down"}), 503
    return jsonify({"status": "healthy"})

@app.route('/ready')
def ready():
    """Readiness probe - return 503 during shutdown to stop new traffic"""
    if shutdown_manager.is_shutting_down:
        return jsonify({"status": "not_ready"}), 503
    return jsonify({"status": "ready"})

def run_server():
    """Run Flask server with graceful shutdown support"""
    from werkzeug.serving import make_server

    # Create threaded server for handling concurrent requests
    server = make_server('0.0.0.0', 5000, app, threaded=True)

    # Register HTTP server shutdown with highest priority
    shutdown_manager.register_handler(
        name="http_server",
        handler=server.shutdown,
        timeout=5.0,
        priority=30  # Stop accepting connections first
    )

    # Start server in background thread
    server_thread = threading.Thread(target=server.serve_forever)
    server_thread.start()

    logger.info("Server started on port 5000")

    # Main thread waits for shutdown signal (SIGTERM/SIGINT)
    shutdown_manager.wait_for_shutdown()

    # Execute graceful shutdown sequence
    shutdown_manager.shutdown()

    # Wait for server thread to finish
    server_thread.join(timeout=5)

if __name__ == '__main__':
    run_server()
```

---

## FastAPI Integration

### FastAPI with Lifespan Events

FastAPI's async nature requires an async-aware shutdown manager. This example uses the lifespan context manager pattern introduced in FastAPI 0.93 for proper startup/shutdown handling with async resources.

```python
# fastapi_graceful.py
# FastAPI application with async graceful shutdown for Kubernetes
from fastapi import FastAPI, Request, HTTPException
from contextlib import asynccontextmanager
import asyncio
import signal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GracefulShutdownManager:
    """Async-aware shutdown manager for FastAPI applications"""

    def __init__(self):
        # Async event for signaling shutdown
        self._shutdown_event = asyncio.Event()
        self._in_flight = 0  # Counter for active requests
        self._lock = asyncio.Lock()  # Async lock for thread safety
        self._handlers = []  # List of (priority, name, handler) tuples

    @property
    def is_shutting_down(self) -> bool:
        """Check if shutdown has been triggered"""
        return self._shutdown_event.is_set()

    def trigger_shutdown(self):
        """Trigger the shutdown process - called by signal handler"""
        self._shutdown_event.set()

    async def track_request(self):
        """Async context manager for tracking in-flight requests"""
        async with self._lock:
            self._in_flight += 1
        try:
            yield
        finally:
            async with self._lock:
                self._in_flight -= 1

    async def wait_for_requests(self, timeout: float = 30):
        """Wait for all in-flight requests to complete (async connection draining)"""
        start = asyncio.get_event_loop().time()
        while True:
            async with self._lock:
                if self._in_flight == 0:
                    return True  # All requests completed
            if asyncio.get_event_loop().time() - start > timeout:
                logger.warning(f"Timeout: {self._in_flight} requests still in flight")
                return False  # Timeout reached
            await asyncio.sleep(0.1)  # Non-blocking wait

    def register_handler(self, name: str, handler, priority: int = 0):
        """Register an async or sync shutdown handler"""
        self._handlers.append((priority, name, handler))

    async def execute_handlers(self):
        """Execute shutdown handlers in priority order (highest first)"""
        handlers = sorted(self._handlers, key=lambda x: x[0], reverse=True)
        for priority, name, handler in handlers:
            try:
                logger.info(f"Executing handler: {name}")
                # Support both async and sync handlers
                if asyncio.iscoroutinefunction(handler):
                    await handler()
                else:
                    handler()
            except Exception as e:
                logger.error(f"Handler {name} failed: {e}")

# Global shutdown manager instance
shutdown_manager = GracefulShutdownManager()

# Example async database connection
class Database:
    async def connect(self):
        logger.info("Database connected")

    async def disconnect(self):
        """Gracefully close database connections"""
        logger.info("Database disconnecting...")
        await asyncio.sleep(0.5)  # Simulate cleanup time
        logger.info("Database disconnected")

# Example async Redis client
class RedisClient:
    async def connect(self):
        logger.info("Redis connected")

    async def disconnect(self):
        """Gracefully close Redis connections"""
        logger.info("Redis disconnecting...")
        await asyncio.sleep(0.2)  # Simulate cleanup time
        logger.info("Redis disconnected")

db = Database()
redis = RedisClient()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown"""
    # === STARTUP PHASE ===
    logger.info("Application starting...")
    await db.connect()
    await redis.connect()

    # Register shutdown handlers with priorities
    # Higher priority = executes first during shutdown
    shutdown_manager.register_handler("redis", redis.disconnect, priority=20)
    shutdown_manager.register_handler("database", db.disconnect, priority=10)

    # Setup signal handlers for async context
    loop = asyncio.get_event_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(
            sig,
            lambda s=sig: asyncio.create_task(handle_signal(s))
        )

    logger.info("Application started")

    yield  # Application runs during this yield

    # === SHUTDOWN PHASE ===
    logger.info("Application shutting down...")
    await shutdown_manager.wait_for_requests(timeout=25)  # Connection draining
    await shutdown_manager.execute_handlers()  # Cleanup resources
    logger.info("Application shutdown complete")

async def handle_signal(sig):
    """Async signal handler - triggers graceful shutdown"""
    logger.info(f"Received signal {sig.name}")
    shutdown_manager.trigger_shutdown()

# Create FastAPI app with lifespan manager
app = FastAPI(lifespan=lifespan)

@app.middleware("http")
async def shutdown_middleware(request: Request, call_next):
    """Middleware to reject requests during shutdown and track in-flight requests"""
    # Return 503 during shutdown
    if shutdown_manager.is_shutting_down:
        raise HTTPException(status_code=503, detail="Service shutting down")

    # Track this request for graceful shutdown
    async for _ in shutdown_manager.track_request():
        response = await call_next(request)
        return response

@app.get("/api/slow")
async def slow_endpoint():
    """Example slow endpoint - demonstrates request tracking"""
    await asyncio.sleep(5)  # Simulate slow operation
    return {"status": "completed"}

@app.get("/health")
async def health():
    """Liveness probe - return 503 during shutdown"""
    if shutdown_manager.is_shutting_down:
        raise HTTPException(status_code=503, detail="Shutting down")
    return {"status": "healthy"}

@app.get("/ready")
async def ready():
    """Readiness probe - return 503 to stop receiving traffic"""
    if shutdown_manager.is_shutting_down:
        raise HTTPException(status_code=503, detail="Not ready")
    return {"status": "ready"}
```

---

## Celery Worker Shutdown

### Graceful Celery Shutdown

Celery workers need special handling for graceful shutdown. This example uses Celery signals to track shutdown state and implements `acks_late=True` for task reliability during worker restarts.

```python
# celery_graceful.py
# Celery worker with graceful shutdown support
from celery import Celery
from celery.signals import worker_shutting_down, worker_shutdown
import logging
import time

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Celery app with Redis broker
app = Celery('tasks', broker='redis://localhost:6379/0')

# Track currently executing tasks for monitoring
active_tasks = set()

@worker_shutting_down.connect
def handle_worker_shutting_down(sig, how, exitcode, **kwargs):
    """Signal handler called when worker receives shutdown signal"""
    logger.info(f"Worker shutting down (signal={sig}, how={how})")
    logger.info(f"Active tasks: {len(active_tasks)}")
    # Worker will wait for active tasks to complete before exiting

@worker_shutdown.connect
def handle_worker_shutdown(**kwargs):
    """Signal handler called after worker has fully shut down"""
    logger.info("Worker shutdown complete")

@app.task(bind=True)
def long_running_task(self, duration: int):
    """Long-running task with abort checking for graceful termination"""
    task_id = self.request.id
    active_tasks.add(task_id)  # Track this task

    try:
        logger.info(f"Task {task_id} started, duration={duration}s")

        # Check for revocation periodically to enable graceful abort
        for i in range(duration):
            if self.is_aborted():
                # Task was revoked - exit gracefully
                logger.warning(f"Task {task_id} aborted")
                return {"status": "aborted"}
            time.sleep(1)  # Do 1 second of work
            logger.debug(f"Task {task_id} progress: {i+1}/{duration}")

        logger.info(f"Task {task_id} completed")
        return {"status": "completed"}

    finally:
        # Always remove from tracking, even on error
        active_tasks.discard(task_id)

@app.task(bind=True, acks_late=True)
def retriable_task(self, data):
    """
    Reliable task with acks_late for graceful shutdown safety.
    If worker dies before task completes, task will be redelivered.
    """
    try:
        process_data(data)
    except Exception as e:
        logger.error(f"Task failed: {e}")
        # Retry with exponential backoff: 1s, 2s, 4s, 8s...
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
```

### Celery Configuration for Graceful Shutdown

These settings optimize Celery for reliable graceful shutdown in Kubernetes. Key settings include `acks_late` for task recovery and `prefetch_multiplier=1` to prevent buffering tasks on workers during shutdown.

```python
# celeryconfig.py
# Celery configuration optimized for graceful shutdown in Kubernetes
from kombu import Queue

# Broker and backend configuration
broker_url = 'redis://localhost:6379/0'
result_backend = 'redis://localhost:6379/0'

# Acknowledgment settings for reliability
task_acks_late = True  # Acknowledge AFTER task completes (not before)
task_reject_on_worker_lost = True  # Requeue task if worker dies unexpectedly

# Prefetch settings - critical for graceful shutdown
worker_prefetch_multiplier = 1  # Only fetch one task at a time per worker
# This prevents workers from buffering tasks they can't complete during shutdown

# Timeout settings to prevent stuck tasks
task_soft_time_limit = 300  # 5 min soft limit (raises SoftTimeLimitExceeded)
task_time_limit = 600       # 10 min hard limit (kills task)

# Worker recycling for memory management
worker_max_tasks_per_child = 1000  # Restart worker process after N tasks
worker_max_memory_per_child = 200000  # Restart if memory exceeds 200MB

# Queue configuration for priority-based routing
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

This Kubernetes deployment configuration includes all the pieces needed for graceful shutdown: appropriate termination grace period, liveness and readiness probes, and a preStop hook to delay SIGTERM until the load balancer is updated.

```yaml
# deployment.yaml
# Kubernetes deployment configured for graceful shutdown
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
      # Total time K8s waits before sending SIGKILL
      # Should be: preStop delay + max request time + cleanup time + buffer
      terminationGracePeriodSeconds: 60
      containers:
      - name: api
        image: python-api:latest
        ports:
        - containerPort: 8000

        # Liveness probe: Is the process healthy?
        # If this fails, K8s restarts the container
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5   # Wait before first check
          periodSeconds: 10        # Check every 10 seconds

        # Readiness probe: Can we receive traffic?
        # If this fails, K8s removes pod from service endpoints
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5   # Wait before first check
          periodSeconds: 5         # Check every 5 seconds

        # Lifecycle hooks
        lifecycle:
          preStop:
            exec:
              # Sleep before SIGTERM to allow load balancer to update
              # This prevents new requests from being sent to a terminating pod
              command:
              - /bin/sh
              - -c
              - "sleep 5"

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Pod Disruption Budget

A Pod Disruption Budget (PDB) prevents too many pods from being terminated simultaneously during voluntary disruptions like node drains or cluster upgrades.

```yaml
# pdb.yaml
# Ensures minimum availability during voluntary disruptions
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: python-api-pdb
spec:
  # At least 2 pods must always be available (or use maxUnavailable: 1)
  minAvailable: 2
  selector:
    matchLabels:
      app: python-api
```

---

## Health Check Endpoints

### Comprehensive Health Checks

This health checker supports multiple components with timeouts, shutdown awareness, and detailed status reporting. It provides both liveness (is the process running?) and readiness (should we receive traffic?) endpoints for Kubernetes probes.

```python
# health_checks.py
# Comprehensive health check system for Kubernetes probes
from fastapi import FastAPI, HTTPException
from enum import Enum
from dataclasses import dataclass
from typing import Dict, Optional
import asyncio

class HealthStatus(Enum):
    """Possible health states for components"""
    HEALTHY = "healthy"      # Fully operational
    DEGRADED = "degraded"    # Working but impaired
    UNHEALTHY = "unhealthy"  # Not working

@dataclass
class ComponentHealth:
    """Health check result for a single component"""
    name: str                       # Component identifier
    status: HealthStatus            # Current health status
    message: Optional[str] = None   # Error message if unhealthy
    latency_ms: Optional[float] = None  # Response time

class HealthChecker:
    """Manages health checks for all application components"""

    def __init__(self):
        self._checks = {}  # Registered health check functions
        self._shutdown_requested = False  # Flag for graceful shutdown

    def request_shutdown(self):
        """Signal that shutdown has been requested"""
        self._shutdown_requested = True

    def register_check(self, name: str, check_func):
        """Register a health check function for a component"""
        self._checks[name] = check_func

    async def check_component(self, name: str, check_func) -> ComponentHealth:
        """Run a single health check with timeout protection"""
        import time
        start = time.time()
        try:
            # Support both sync and async check functions
            if asyncio.iscoroutinefunction(check_func):
                # Async check with 5 second timeout
                result = await asyncio.wait_for(check_func(), timeout=5.0)
            else:
                result = check_func()

            # Calculate response time
            latency = (time.time() - start) * 1000
            return ComponentHealth(
                name=name,
                status=HealthStatus.HEALTHY if result else HealthStatus.UNHEALTHY,
                latency_ms=latency
            )
        except asyncio.TimeoutError:
            # Health check took too long
            return ComponentHealth(
                name=name,
                status=HealthStatus.UNHEALTHY,
                message="Health check timeout"
            )
        except Exception as e:
            # Health check threw an exception
            return ComponentHealth(
                name=name,
                status=HealthStatus.UNHEALTHY,
                message=str(e)
            )

    async def get_health(self) -> Dict:
        """Run all health checks and aggregate results"""
        results = []
        for name, check in self._checks.items():
            result = await self.check_component(name, check)
            results.append(result)

        # Determine overall status (worst status wins)
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
        """Check if service should accept traffic (returns False during shutdown)"""
        return not self._shutdown_requested

# Create singleton health checker
health_checker = HealthChecker()

# Register component health checks
async def check_database():
    """Verify database connection is working"""
    # In production: run a simple query like SELECT 1
    return True

async def check_redis():
    """Verify Redis connection is working"""
    # In production: run PING command
    return True

health_checker.register_check("database", check_database)
health_checker.register_check("redis", check_redis)

app = FastAPI()

@app.get("/health")
async def health():
    """Liveness probe - is the process running and healthy?"""
    return await health_checker.get_health()

@app.get("/ready")
async def ready():
    """Readiness probe - should this pod receive traffic?"""
    # Return 503 if shutdown requested (stops new traffic)
    if not health_checker.is_ready():
        raise HTTPException(status_code=503, detail="Not ready")

    # Return 503 if any component is unhealthy
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
