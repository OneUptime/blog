# How to Handle Docker Container Graceful Shutdown and Signal Handling

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Containers, DevOps, Reliability, Graceful Shutdown

Description: Learn how to implement graceful shutdown in Docker containers, handle SIGTERM signals properly, and avoid dropped connections during deployments and scaling events.

---

When Docker stops a container, it sends SIGTERM, waits for a grace period, then sends SIGKILL. If your application doesn't handle SIGTERM properly, it gets forcefully terminated, potentially losing in-flight requests, corrupting data, or leaving resources in a bad state. Proper signal handling is essential for production containers.

## How Docker Stops Containers

```
1. Docker sends SIGTERM to PID 1
2. Docker waits for stop timeout (default 10 seconds)
3. Docker sends SIGKILL (cannot be caught)
4. Container is removed
```

The stop timeout can be configured:
```bash
# Wait 30 seconds before SIGKILL
docker stop -t 30 my-container

# In docker-compose.yml
services:
  app:
    stop_grace_period: 30s
```

## The PID 1 Problem

In Docker, the process specified in ENTRYPOINT/CMD becomes PID 1. This is important because:

1. Signals are sent to PID 1
2. Shell form commands run as children of `/bin/sh`, not as PID 1
3. Shells don't forward signals to children by default

### Problem: Shell Form

```dockerfile
# BAD: node runs as child of shell
CMD node server.js
# Shell (PID 1) receives SIGTERM, but doesn't forward to node
```

```
Container
└── /bin/sh (PID 1)  ← Receives SIGTERM
    └── node server.js (PID 7)  ← Never gets signal
```

### Solution: Exec Form

```dockerfile
# GOOD: node is PID 1
CMD ["node", "server.js"]
```

```
Container
└── node server.js (PID 1)  ← Receives SIGTERM directly
```

## Signal Handling by Language

### Node.js

```javascript
// server.js
const http = require('http');

const server = http.createServer((req, res) => {
  res.end('Hello World');
});

server.listen(3000, () => {
  console.log('Server started on port 3000');
});

// Graceful shutdown handler
const shutdown = (signal) => {
  console.log(`Received ${signal}, shutting down gracefully`);

  server.close(() => {
    console.log('HTTP server closed');

    // Close database connections, etc.
    // db.end();

    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));  // Ctrl+C
```

### Python

```python
# server.py
import signal
import sys
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

server = None

def shutdown_handler(signum, frame):
    print(f"Received signal {signum}, shutting down...")

    if server:
        server.shutdown()

    # Clean up resources
    # db.close()

    sys.exit(0)

signal.signal(signal.SIGTERM, shutdown_handler)
signal.signal(signal.SIGINT, shutdown_handler)

if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8000), SimpleHTTPRequestHandler)
    print('Server started on port 8000')
    server.serve_forever()
```

### Go

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    server := &http.Server{Addr: ":8080"}

    // Channel to listen for shutdown signals
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGTERM, syscall.SIGINT)

    go func() {
        fmt.Println("Server started on port 8080")
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            fmt.Printf("HTTP server error: %v\n", err)
        }
    }()

    // Wait for shutdown signal
    <-stop
    fmt.Println("Shutting down gracefully...")

    // Create context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        fmt.Printf("Shutdown error: %v\n", err)
    }

    fmt.Println("Server stopped")
}
```

### Java (Spring Boot)

Spring Boot handles graceful shutdown automatically when configured:

```yaml
# application.yml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

## Entrypoint Scripts with Proper Signal Handling

When using wrapper scripts, you must forward signals to the main process.

### Using exec

```bash
#!/bin/bash
# docker-entrypoint.sh

# Setup code
echo "Initializing..."
./setup.sh

# exec replaces the shell with the main process
# Now the main process is PID 1 and receives signals
exec "$@"
```

### Using trap (When exec Isn't Possible)

```bash
#!/bin/bash
# docker-entrypoint.sh

# Track child PID
CHILD_PID=""

# Forward signals to child
forward_signal() {
    if [ -n "$CHILD_PID" ]; then
        kill -$1 "$CHILD_PID" 2>/dev/null
    fi
}

trap 'forward_signal TERM' TERM
trap 'forward_signal INT' INT
trap 'forward_signal QUIT' QUIT

# Start main process in background
"$@" &
CHILD_PID=$!

# Wait for child to exit
wait $CHILD_PID
EXIT_CODE=$?

exit $EXIT_CODE
```

### Using dumb-init or tini

For complex scenarios, use an init system designed for containers.

```dockerfile
FROM node:18-slim

# Install tini
RUN apt-get update && apt-get install -y tini && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# tini handles signal forwarding and zombie reaping
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]
```

Or with dumb-init:
```dockerfile
FROM python:3.11-slim

RUN pip install dumb-init

ENTRYPOINT ["dumb-init", "--"]
CMD ["python", "server.py"]
```

## Kubernetes Integration

Kubernetes sends SIGTERM when terminating pods, with configurable grace period.

```yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60  # Default is 30
      containers:
        - name: app
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 10"]
```

### PreStop Hook Pattern

Give load balancers time to remove the pod before starting shutdown.

```yaml
lifecycle:
  preStop:
    exec:
      command:
        - /bin/sh
        - -c
        - |
          # Sleep to allow load balancer to update
          sleep 5
          # Then trigger graceful shutdown
          kill -TERM 1
```

## Testing Graceful Shutdown

### Basic Test

```bash
# Start container
docker run -d --name test my-app

# Send SIGTERM
docker stop test

# Check logs for graceful shutdown message
docker logs test
```

### Detailed Test

```bash
#!/bin/bash
# test-graceful-shutdown.sh

# Start container
docker run -d --name test my-app

# Give it time to start
sleep 5

# Make a request that takes a while
curl -X POST http://localhost:8080/slow-endpoint &
REQUEST_PID=$!

# Immediately trigger shutdown
docker stop -t 30 test

# Wait for request to complete
wait $REQUEST_PID
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "PASS: Request completed successfully"
else
    echo "FAIL: Request was interrupted"
fi

docker rm test
```

### Check Signal Handling

```bash
# Run interactively to test
docker run -it --rm my-app

# In another terminal, send SIGTERM
docker kill --signal SIGTERM <container_id>

# Watch the first terminal for graceful shutdown
```

## Common Pitfalls

### Pitfall 1: npm start Doesn't Forward Signals

```dockerfile
# BAD: npm doesn't forward signals
CMD ["npm", "start"]

# GOOD: Run node directly
CMD ["node", "server.js"]

# Or use npm with proper signal handling in package.json
```

In package.json:
```json
{
  "scripts": {
    "start": "exec node server.js"
  }
}
```

### Pitfall 2: Using Shell Form

```dockerfile
# BAD: Shell doesn't forward signals
CMD npm start

# GOOD: Exec form, node receives signals
CMD ["node", "server.js"]
```

### Pitfall 3: Long-Running Operations During Shutdown

```javascript
// BAD: Shutdown takes forever
process.on('SIGTERM', async () => {
  await processAllRemainingJobs();  // Could take minutes
  process.exit(0);
});

// GOOD: Bounded shutdown time
process.on('SIGTERM', async () => {
  // Stop accepting new work
  stopAcceptingWork();

  // Wait for in-flight operations (with timeout)
  await Promise.race([
    finishInFlightWork(),
    new Promise(r => setTimeout(r, 25000))  // 25s timeout
  ]);

  process.exit(0);
});
```

### Pitfall 4: Ignoring Connection Draining

```javascript
// BAD: Close immediately, drop in-flight requests
server.close();

// GOOD: Stop accepting, wait for in-flight
server.close(() => {
  console.log('All connections closed');
  process.exit(0);
});
```

## Complete Example: Express.js with PostgreSQL

```javascript
const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let isShuttingDown = false;

// Middleware to reject new requests during shutdown
app.use((req, res, next) => {
  if (isShuttingDown) {
    res.status(503).json({ error: 'Server is shutting down' });
    return;
  }
  next();
});

app.get('/health', (req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ status: 'shutting down' });
  } else {
    res.json({ status: 'healthy' });
  }
});

app.get('/', async (req, res) => {
  const result = await pool.query('SELECT NOW()');
  res.json({ time: result.rows[0].now });
});

const server = app.listen(3000, () => {
  console.log('Server started on port 3000');
});

const shutdown = async (signal) => {
  console.log(`Received ${signal}`);
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

    // Close database pool
    await pool.end();
    console.log('Database pool closed');

    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    console.error('Forcing exit after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

## Summary

| Aspect | Bad Practice | Good Practice |
|--------|--------------|---------------|
| Dockerfile CMD | Shell form: `CMD npm start` | Exec form: `CMD ["node", "server.js"]` |
| Signal handling | Not handling SIGTERM | Catching SIGTERM, cleaning up |
| HTTP server | `process.exit()` immediately | `server.close()` then exit |
| Database connections | Leave open | Close gracefully |
| In-flight requests | Drop them | Wait for completion |
| Stop timeout | Default 10s | Configure based on app needs |

Graceful shutdown is critical for reliable deployments. Ensure your process is PID 1 (or use tini/dumb-init), handle SIGTERM, drain connections, and configure appropriate timeouts for your workload.
