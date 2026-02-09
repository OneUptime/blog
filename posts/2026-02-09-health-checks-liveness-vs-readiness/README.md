# How to Implement Health Checks That Distinguish Between Liveness and Readiness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Health Checks, Liveness Probes, Readiness Probes, Container Orchestration

Description: Learn how to implement health checks that properly distinguish between liveness and readiness in Kubernetes, ensuring your applications handle startup, runtime failures, and traffic routing correctly.

---

Understanding the difference between liveness and readiness probes is critical for building resilient Kubernetes applications. These two probe types serve distinct purposes, and implementing them incorrectly can lead to cascading failures, unnecessary restarts, or traffic being routed to unhealthy pods.

## Understanding Liveness vs Readiness

Liveness probes answer the question: "Is my application alive and running?" If a liveness probe fails, Kubernetes restarts the container, assuming it's in an unrecoverable state. This mechanism helps recover from deadlocks, memory leaks, or corrupted application state.

Readiness probes answer a different question: "Is my application ready to serve traffic?" If a readiness probe fails, Kubernetes removes the pod from service endpoints, preventing traffic from reaching it. The container continues running, giving the application time to recover without a restart.

The key distinction is recovery strategy. Liveness failures trigger restarts. Readiness failures trigger traffic removal.

## Common Mistakes in Health Check Implementation

Many developers implement the same endpoint for both probes. This approach misses the nuance between these checks and can cause problems.

For example, if your readiness check fails because a database connection is temporarily unavailable, you don't want Kubernetes to restart your container. You want it to stop sending traffic until the database recovers. Restarting won't help and may make things worse.

Another common mistake is making liveness checks too sensitive. If your liveness probe fails due to a temporary slowdown, Kubernetes restarts the container, potentially making the situation worse as the new container competes for resources during startup.

## Implementing Distinct Health Check Endpoints

Let's build a Node.js application with properly separated health checks.

```javascript
// healthcheck.js
const express = require('express');
const http = require('http');

class HealthChecker {
  constructor() {
    this.isAlive = true;
    this.isReady = false;
    this.dependencies = {
      database: false,
      cache: false,
      messageQueue: false
    };
  }

  // Liveness check - basic application health
  checkLiveness() {
    // Simple checks that indicate the app is fundamentally broken
    // Only things that require a restart to fix
    return {
      alive: this.isAlive,
      timestamp: new Date().toISOString(),
      checks: {
        eventLoop: this.checkEventLoop(),
        memory: this.checkMemoryThreshold()
      }
    };
  }

  checkEventLoop() {
    // Check if event loop is responsive
    const start = Date.now();
    setImmediate(() => {
      const delay = Date.now() - start;
      return delay < 1000; // Event loop responsive
    });
    return true;
  }

  checkMemoryThreshold() {
    // Check if we're not in critical memory state
    const usage = process.memoryUsage();
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
    // Only fail if we're in critical state (>95%)
    return heapUsedPercent < 95;
  }

  // Readiness check - ability to serve traffic
  checkReadiness() {
    // Check all external dependencies
    // These can be temporarily unavailable without requiring restart
    const allDependenciesReady = Object.values(this.dependencies)
      .every(status => status === true);

    return {
      ready: this.isReady && allDependenciesReady,
      timestamp: new Date().toISOString(),
      dependencies: { ...this.dependencies }
    };
  }

  async checkDatabaseConnection() {
    try {
      // Simulate database check
      // In real code, execute a simple query
      // SELECT 1 or ping command
      await this.simulateDbQuery();
      this.dependencies.database = true;
      return true;
    } catch (error) {
      this.dependencies.database = false;
      console.error('Database check failed:', error.message);
      return false;
    }
  }

  async checkCacheConnection() {
    try {
      // Check Redis or memcached connection
      await this.simulateCacheCheck();
      this.dependencies.cache = true;
      return true;
    } catch (error) {
      this.dependencies.cache = false;
      console.error('Cache check failed:', error.message);
      return false;
    }
  }

  async checkMessageQueue() {
    try {
      // Check Kafka, RabbitMQ, or similar
      await this.simulateQueueCheck();
      this.dependencies.messageQueue = true;
      return true;
    } catch (error) {
      this.dependencies.messageQueue = false;
      console.error('Message queue check failed:', error.message);
      return false;
    }
  }

  // Simulate checks - replace with real implementations
  async simulateDbQuery() {
    return new Promise((resolve) => setTimeout(resolve, 50));
  }

  async simulateCacheCheck() {
    return new Promise((resolve) => setTimeout(resolve, 30));
  }

  async simulateQueueCheck() {
    return new Promise((resolve) => setTimeout(resolve, 40));
  }

  async initialize() {
    // Run all dependency checks during startup
    await Promise.all([
      this.checkDatabaseConnection(),
      this.checkCacheConnection(),
      this.checkMessageQueue()
    ]);
    this.isReady = true;
  }

  // Periodic health monitoring
  startPeriodicChecks(interval = 5000) {
    setInterval(async () => {
      await this.checkDatabaseConnection();
      await this.checkCacheConnection();
      await this.checkMessageQueue();
    }, interval);
  }
}

// Express application setup
const app = express();
const healthChecker = new HealthChecker();

// Liveness endpoint - lightweight and fast
app.get('/healthz/live', (req, res) => {
  const status = healthChecker.checkLiveness();

  if (status.alive) {
    res.status(200).json(status);
  } else {
    res.status(503).json(status);
  }
});

// Readiness endpoint - checks dependencies
app.get('/healthz/ready', (req, res) => {
  const status = healthChecker.checkReadiness();

  if (status.ready) {
    res.status(200).json(status);
  } else {
    res.status(503).json(status);
  }
});

// Application initialization
async function startServer() {
  const PORT = process.env.PORT || 3000;

  // Initialize health checker
  await healthChecker.initialize();
  healthChecker.startPeriodicChecks();

  // Start listening
  const server = http.createServer(app);
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    healthChecker.isReady = false; // Stop accepting new traffic

    setTimeout(() => {
      server.close(() => {
        healthChecker.isAlive = false;
        process.exit(0);
      });
    }, 5000); // Grace period for in-flight requests
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

module.exports = { HealthChecker };
```

## Kubernetes Configuration

Configure your deployment with distinct probe configurations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-application
  template:
    metadata:
      labels:
        app: web-application
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 3000
          name: http

        # Liveness probe configuration
        livenessProbe:
          httpGet:
            path: /healthz/live
            port: 3000
            scheme: HTTP
          initialDelaySeconds: 30  # Wait for app to start
          periodSeconds: 10         # Check every 10 seconds
          timeoutSeconds: 5         # Give it 5 seconds to respond
          successThreshold: 1       # One success means healthy
          failureThreshold: 3       # Three failures trigger restart

        # Readiness probe configuration
        readinessProbe:
          httpGet:
            path: /healthz/ready
            port: 3000
            scheme: HTTP
          initialDelaySeconds: 10   # Check sooner than liveness
          periodSeconds: 5          # Check more frequently
          timeoutSeconds: 3         # Shorter timeout
          successThreshold: 1       # One success adds to endpoints
          failureThreshold: 2       # Two failures remove from endpoints

        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

## Python Implementation with Flask

Here's a Python equivalent using Flask:

```python
# health_checker.py
from flask import Flask, jsonify
import time
import psutil
import threading
from typing import Dict, Any

class HealthChecker:
    def __init__(self):
        self.is_alive = True
        self.is_ready = False
        self.dependencies = {
            'database': False,
            'cache': False,
            'message_queue': False
        }
        self._lock = threading.Lock()

    def check_liveness(self) -> Dict[str, Any]:
        """
        Liveness check - only fails if restart is needed
        Checks fundamental process health
        """
        memory_ok = self._check_memory_pressure()

        return {
            'alive': self.is_alive and memory_ok,
            'timestamp': time.time(),
            'checks': {
                'memory': memory_ok,
                'process': True
            }
        }

    def _check_memory_pressure(self) -> bool:
        """Check if memory usage is critical"""
        memory = psutil.virtual_memory()
        # Only fail if we're in critical memory state
        return memory.percent < 95

    def check_readiness(self) -> Dict[str, Any]:
        """
        Readiness check - checks ability to serve traffic
        Includes all external dependencies
        """
        with self._lock:
            all_deps_ready = all(self.dependencies.values())

            return {
                'ready': self.is_ready and all_deps_ready,
                'timestamp': time.time(),
                'dependencies': dict(self.dependencies)
            }

    def check_database(self) -> bool:
        """Check database connectivity"""
        try:
            # Replace with actual database check
            # e.g., db.execute("SELECT 1")
            time.sleep(0.05)  # Simulate check
            with self._lock:
                self.dependencies['database'] = True
            return True
        except Exception as e:
            print(f"Database check failed: {e}")
            with self._lock:
                self.dependencies['database'] = False
            return False

    def check_cache(self) -> bool:
        """Check cache connectivity"""
        try:
            # Replace with actual Redis/Memcached check
            # e.g., redis_client.ping()
            time.sleep(0.03)  # Simulate check
            with self._lock:
                self.dependencies['cache'] = True
            return True
        except Exception as e:
            print(f"Cache check failed: {e}")
            with self._lock:
                self.dependencies['cache'] = False
            return False

    def check_message_queue(self) -> bool:
        """Check message queue connectivity"""
        try:
            # Replace with actual queue check
            # e.g., rabbitmq_channel.basic_publish(...)
            time.sleep(0.04)  # Simulate check
            with self._lock:
                self.dependencies['message_queue'] = True
            return True
        except Exception as e:
            print(f"Message queue check failed: {e}")
            with self._lock:
                self.dependencies['message_queue'] = False
            return False

    def initialize(self):
        """Initialize all dependencies"""
        self.check_database()
        self.check_cache()
        self.check_message_queue()
        self.is_ready = True

    def start_periodic_checks(self, interval: int = 5):
        """Start background thread for periodic health checks"""
        def run_checks():
            while self.is_alive:
                self.check_database()
                self.check_cache()
                self.check_message_queue()
                time.sleep(interval)

        thread = threading.Thread(target=run_checks, daemon=True)
        thread.start()

# Flask application
app = Flask(__name__)
health_checker = HealthChecker()

@app.route('/healthz/live', methods=['GET'])
def liveness():
    """Liveness probe endpoint"""
    status = health_checker.check_liveness()
    status_code = 200 if status['alive'] else 503
    return jsonify(status), status_code

@app.route('/healthz/ready', methods=['GET'])
def readiness():
    """Readiness probe endpoint"""
    status = health_checker.check_readiness()
    status_code = 200 if status['ready'] else 503
    return jsonify(status), status_code

if __name__ == '__main__':
    # Initialize health checker
    health_checker.initialize()
    health_checker.start_periodic_checks()

    # Start Flask app
    app.run(host='0.0.0.0', port=3000)
```

## Best Practices for Health Check Design

Keep liveness checks simple and fast. They should only detect conditions that require a restart. Memory exhaustion, deadlocks, and corrupted state are good candidates. Temporary network issues or slow responses are not.

Make readiness checks comprehensive but still fast. Check all critical dependencies that affect your ability to serve requests. Database connections, cache availability, and downstream service health are appropriate checks.

Set appropriate timeouts and thresholds. Liveness probes should have higher failure thresholds to avoid restart loops. Readiness probes can be more aggressive since they only remove traffic.

Always include a startup probe for slow-starting applications. This prevents premature liveness check failures during initialization.

## Monitoring Health Check Metrics

Track health check status in your monitoring system:

```javascript
// Add metrics collection
const promClient = require('prom-client');

const livenessCheckGauge = new promClient.Gauge({
  name: 'app_liveness_status',
  help: 'Application liveness status (1 = alive, 0 = dead)'
});

const readinessCheckGauge = new promClient.Gauge({
  name: 'app_readiness_status',
  help: 'Application readiness status (1 = ready, 0 = not ready)'
});

const dependencyHealthGauge = new promClient.Gauge({
  name: 'app_dependency_health',
  help: 'Dependency health status',
  labelNames: ['dependency']
});

// Update metrics in health checker
function updateMetrics(healthChecker) {
  const liveness = healthChecker.checkLiveness();
  const readiness = healthChecker.checkReadiness();

  livenessCheckGauge.set(liveness.alive ? 1 : 0);
  readinessCheckGauge.set(readiness.ready ? 1 : 0);

  Object.entries(healthChecker.dependencies).forEach(([dep, status]) => {
    dependencyHealthGauge.set({ dependency: dep }, status ? 1 : 0);
  });
}
```

Properly implemented health checks form the foundation of resilient Kubernetes applications. By distinguishing between liveness and readiness, you give Kubernetes the information it needs to manage your application lifecycle effectively, ensuring high availability and graceful handling of both permanent failures and temporary issues.
