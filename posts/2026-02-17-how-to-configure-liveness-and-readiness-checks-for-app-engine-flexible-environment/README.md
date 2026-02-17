# How to Configure Liveness and Readiness Checks for App Engine Flexible Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Health Checks, Flexible Environment, Monitoring

Description: Configure liveness and readiness checks for App Engine Flexible Environment to ensure your application handles traffic only when healthy and ready.

---

App Engine Flexible Environment uses two types of health checks to manage your application instances: liveness checks and readiness checks. Liveness checks determine if an instance is running and responsive. Readiness checks determine if an instance is ready to accept traffic. Getting these configured correctly is the difference between a smooth-running application and one that serves errors during deployments or recovers poorly from failures.

In this post, I will explain how each health check works, how to configure them, and how to implement proper health check endpoints in your application.

## Liveness Checks vs Readiness Checks

Think of it this way:

- **Liveness check**: "Is the process alive?" If it fails, App Engine restarts the instance.
- **Readiness check**: "Can it handle requests?" If it fails, App Engine stops routing traffic to it but keeps the instance running.

These serve different purposes. An instance might be alive (the process is running) but not ready (it is still loading data or waiting for a database connection). By separating these checks, App Engine can make smarter decisions about traffic routing.

## Configuring Health Checks in app.yaml

Here is a complete configuration with both checks:

```yaml
# app.yaml - Health check configuration for App Engine Flex
runtime: custom
env: flex

liveness_check:
  path: "/_ah/live"
  check_interval_sec: 30     # How often to check (seconds)
  timeout_sec: 4             # Max time to wait for response
  failure_threshold: 4       # Failures before marking unhealthy
  success_threshold: 2       # Successes before marking healthy again
  initial_delay_sec: 300     # Wait before starting checks after instance boot

readiness_check:
  path: "/_ah/ready"
  check_interval_sec: 5      # Check more frequently than liveness
  timeout_sec: 4             # Max time to wait for response
  failure_threshold: 2       # Fewer failures needed to stop traffic
  success_threshold: 2       # Successes before routing traffic
  app_start_timeout_sec: 300 # Max time to wait for first successful check

resources:
  cpu: 1
  memory_gb: 1
  disk_size_gb: 10
```

Let me break down each setting.

### Liveness Check Settings

- `path`: The URL path that App Engine hits. Must return 200 for healthy.
- `check_interval_sec`: Time between checks. Default is 30 seconds. Lower values detect failures faster but generate more overhead.
- `timeout_sec`: How long to wait for a response. If the check times out, it counts as a failure.
- `failure_threshold`: Number of consecutive failures before App Engine restarts the instance. Default is 4. Set this higher for applications that have occasional slow responses.
- `success_threshold`: Consecutive successes needed to mark a restarted instance as healthy again. Default is 2.
- `initial_delay_sec`: How long to wait after the instance starts before beginning liveness checks. This gives your application time to start up. Default is 300 seconds.

### Readiness Check Settings

- `path`: The URL path for readiness checks. Separate from liveness.
- `check_interval_sec`: Usually shorter than liveness because you want to route traffic quickly once an instance is ready. Default is 5 seconds.
- `failure_threshold`: Consecutive failures before removing the instance from the traffic pool. Default is 2 - more aggressive than liveness because you want to stop routing to a struggling instance quickly.
- `success_threshold`: Successes needed before adding the instance back to the traffic pool.
- `app_start_timeout_sec`: Maximum time to wait for the first successful readiness check after boot. If the instance does not become ready within this time, it gets terminated.

## Implementing Health Check Endpoints

### Simple Health Checks

For basic applications, simple endpoints that return 200 are sufficient:

```python
# Simple health checks - just verify the process is running
@app.route("/_ah/live")
def liveness():
    return "OK", 200

@app.route("/_ah/ready")
def readiness():
    return "OK", 200
```

But this misses the point. If your application is alive but cannot reach the database, you are still routing traffic to it and users get errors. Better health checks actually verify dependencies.

### Comprehensive Health Checks

Here is a more thorough implementation:

```python
# health.py - Comprehensive health check endpoints
import time
import redis
import sqlalchemy
from flask import Flask, jsonify

app = Flask(__name__)

# Track application state
startup_time = time.time()
is_initialized = False
db_engine = None
redis_client = None

def initialize_app():
    """Run during startup - called from warmup or first request."""
    global is_initialized, db_engine, redis_client
    try:
        db_engine = create_database_engine()
        redis_client = create_redis_client()
        is_initialized = True
    except Exception as e:
        app.logger.error(f"Initialization failed: {e}")
        is_initialized = False

@app.route("/_ah/live")
def liveness():
    """Liveness check - is the process functioning?
    This should be lightweight. Only check if the process itself
    can handle requests. Do NOT check external dependencies here.
    """
    # Check if the process can allocate memory and do basic work
    try:
        _ = {"status": "alive", "uptime": time.time() - startup_time}
        return "OK", 200
    except Exception:
        return "FAIL", 503

@app.route("/_ah/ready")
def readiness():
    """Readiness check - can this instance handle real traffic?
    Check all critical dependencies. If any are down,
    return 503 to stop receiving traffic.
    """
    checks = {}

    # Check if initialization has completed
    if not is_initialized:
        return jsonify({"ready": False, "reason": "not initialized"}), 503

    # Check database connectivity
    try:
        with db_engine.connect() as conn:
            conn.execute(sqlalchemy.text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"failed: {str(e)}"
        return jsonify({"ready": False, "checks": checks}), 503

    # Check Redis connectivity
    try:
        redis_client.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = f"failed: {str(e)}"
        return jsonify({"ready": False, "checks": checks}), 503

    return jsonify({"ready": True, "checks": checks}), 200
```

### Node.js Implementation

```javascript
// health.js - Health check endpoints for Node.js
const express = require("express");
const router = express.Router();

// Application state tracking
let isReady = false;
let dbPool = null;
let redisClient = null;

function setDependencies(db, redis) {
  dbPool = db;
  redisClient = redis;
  isReady = true;
}

// Liveness check - lightweight, no dependency checks
router.get("/_ah/live", (req, res) => {
  // If the process can respond, it is alive
  res.status(200).send("OK");
});

// Readiness check - verify all dependencies
router.get("/_ah/ready", async (req, res) => {
  if (!isReady) {
    return res.status(503).json({ ready: false, reason: "initializing" });
  }

  const checks = {};

  // Verify database connection
  try {
    await dbPool.raw("SELECT 1");
    checks.database = "ok";
  } catch (err) {
    checks.database = `failed: ${err.message}`;
    return res.status(503).json({ ready: false, checks });
  }

  // Verify Redis connection
  try {
    await redisClient.ping();
    checks.redis = "ok";
  } catch (err) {
    checks.redis = `failed: ${err.message}`;
    return res.status(503).json({ ready: false, checks });
  }

  res.status(200).json({ ready: true, checks });
});

module.exports = { router, setDependencies };
```

## The Key Principle: Liveness Should Be Lightweight

A common mistake is putting dependency checks in the liveness endpoint. Here is why that is bad:

If your database goes down and the liveness check fails because it checks the database, App Engine will restart your instance. But restarting does not fix a database outage. Now you have an instance going through a startup cycle for no reason, and when it comes back up, the database is still down, so it fails the liveness check again and gets restarted again. You end up in a restart loop.

Keep liveness checks simple - just verify the process is running. Put dependency checks in the readiness endpoint. When the database goes down, the readiness check fails, App Engine stops routing traffic (which is the right thing to do), but the instance stays alive and ready to serve traffic again as soon as the database recovers.

## Tuning for Deployment Speed

During deployments, readiness checks determine how quickly new instances start receiving traffic. If your readiness check interval is 5 seconds and you need 2 successes, the minimum time before traffic routing is 10 seconds.

For faster deployments:

```yaml
readiness_check:
  path: "/_ah/ready"
  check_interval_sec: 2      # Check every 2 seconds during startup
  timeout_sec: 3
  failure_threshold: 2
  success_threshold: 1        # Accept after 1 success
  app_start_timeout_sec: 180  # Shorter startup deadline
```

For more cautious deployments (complex applications):

```yaml
readiness_check:
  path: "/_ah/ready"
  check_interval_sec: 5
  timeout_sec: 5
  failure_threshold: 3
  success_threshold: 3        # Require 3 consecutive successes
  app_start_timeout_sec: 600  # Allow 10 minutes for startup
```

## Handling Graceful Shutdown

When App Engine decides to stop an instance, it sends a SIGTERM signal and then stops the readiness check. Your application should handle this signal:

```python
# Graceful shutdown handling
import signal
import sys

shutting_down = False

def handle_sigterm(signum, frame):
    global shutting_down
    shutting_down = True
    app.logger.info("SIGTERM received, starting graceful shutdown")
    # Finish in-flight requests, close connections, etc.
    sys.exit(0)

signal.signal(signal.SIGTERM, handle_sigterm)

@app.route("/_ah/ready")
def readiness():
    # Return 503 during shutdown so no new traffic is routed here
    if shutting_down:
        return "Shutting down", 503
    # ... normal readiness checks
```

## Debugging Health Check Failures

When health checks fail, check the logs:

```bash
# View health check related logs
gcloud logging read 'resource.type="gae_app" AND "health"' \
  --project=your-project-id \
  --limit=50

# View instance lifecycle events
gcloud logging read 'resource.type="gae_app" AND "instance"' \
  --project=your-project-id \
  --limit=50
```

If instances keep restarting, your liveness check is likely failing. If instances are running but not receiving traffic, the readiness check is failing. The logs will show which check is the issue.

## Summary

Configure liveness checks to be lightweight - they should only verify the process is running. Configure readiness checks to verify all critical dependencies like databases and caches. Keep liveness failure thresholds higher (4+) to avoid unnecessary restarts, and readiness failure thresholds lower (2) to quickly stop routing to struggling instances. Separate the two checks into different endpoints with different logic, and always handle SIGTERM for graceful shutdown. Proper health check configuration is the foundation of reliable deployments and self-healing behavior on App Engine Flex.
