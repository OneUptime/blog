# How to Fix Docker Container Exit Code 143 (SIGTERM)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, exit code 143, SIGTERM, graceful shutdown, signal handling, containers, troubleshooting

Description: Understand and fix Docker container exit code 143, which indicates SIGTERM was received but not handled properly for graceful shutdown.

---

Your container exits with code 143 and you are wondering if something is wrong. The short answer: exit code 143 means the process received SIGTERM (signal 15) and terminated. The math is 128 + 15 = 143. Unlike exit code 137 (SIGKILL), which is a forceful kill, SIGTERM is a polite request to shut down. The process has the chance to clean up before exiting.

Exit code 143 is not inherently a problem. It is the normal result of `docker stop`. But if your containers are exiting with 143 unexpectedly, or if your orchestrator treats it as a failure and keeps restarting the container, you need to understand what is going on.

## When Exit Code 143 Is Normal

Docker sends SIGTERM in these situations:

- `docker stop my-container` - You manually stop the container
- `docker compose down` - Compose shuts down all services
- `docker compose up` with a changed image - Compose replaces the old container
- Kubernetes pod termination - K8s sends SIGTERM before killing
- Docker Swarm rolling updates - Swarm sends SIGTERM to old tasks

In all these cases, exit code 143 is expected and correct behavior.

```bash
# This will result in exit code 143
docker stop my-container
docker inspect my-container --format '{{.State.ExitCode}}'
# Output: 143
```

## When Exit Code 143 Is a Problem

Exit code 143 becomes a problem when:

1. Your process does not handle SIGTERM, so it exits immediately without cleanup
2. Your orchestrator (Kubernetes, Swarm) treats any non-zero exit code as a failure
3. Data corruption occurs because the application did not finish writing
4. Client requests are dropped during shutdown

## The PID 1 Problem

The biggest source of SIGTERM handling issues in Docker is the PID 1 problem. The first process in a container runs as PID 1, and PID 1 has special signal handling behavior in Linux. By default, signals sent to PID 1 are ignored unless the process explicitly registers a handler.

Check what runs as PID 1 in your container:

```bash
# See what process is PID 1
docker exec my-container ps aux | head -5

# Or check the Dockerfile's CMD/ENTRYPOINT
docker inspect my-container --format '{{.Config.Cmd}} {{.Config.Entrypoint}}'
```

Common PID 1 problems:

```dockerfile
# Problem: shell form CMD wraps the command in /bin/sh -c
# /bin/sh does NOT forward signals to child processes
CMD npm start
# PID 1 is /bin/sh, which ignores SIGTERM
# Your Node.js process never receives the signal

# Fix: use exec form so your process IS PID 1
CMD ["node", "server.js"]
# PID 1 is node, which can handle SIGTERM directly
```

## Fix 1: Use Exec Form for CMD and ENTRYPOINT

Always use the JSON array (exec) form for CMD and ENTRYPOINT:

```dockerfile
# Wrong: shell form - creates a shell wrapper that eats signals
CMD node server.js
ENTRYPOINT /app/start.sh

# Right: exec form - your process is PID 1 and gets signals directly
CMD ["node", "server.js"]
ENTRYPOINT ["/app/start.sh"]
```

If you must use a shell script as the entrypoint, use `exec` to replace the shell process:

```bash
#!/bin/sh
# entrypoint.sh - use exec to replace shell with the app process

# Do setup work
echo "Setting up environment..."
export APP_CONFIG=/etc/app/config.json

# Use exec so the app becomes PID 1 and receives signals
exec node server.js
```

```dockerfile
# Make sure the script is executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
```

## Fix 2: Add Signal Handlers to Your Application

Implement SIGTERM handling in your application code.

Node.js:

```javascript
// Graceful shutdown handler for Node.js
const server = app.listen(8080, () => {
    console.log('Server running on port 8080');
});

// Track open connections for graceful shutdown
let connections = new Set();
server.on('connection', (conn) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
});

function shutdown() {
    console.log('SIGTERM received. Starting graceful shutdown...');

    // Stop accepting new connections
    server.close(() => {
        console.log('All connections closed. Exiting.');
        process.exit(0);  // Exit with 0 instead of 143
    });

    // Close idle connections
    for (const conn of connections) {
        conn.end();
    }

    // Force close after timeout
    setTimeout(() => {
        console.log('Forcing shutdown after timeout');
        for (const conn of connections) {
            conn.destroy();
        }
        process.exit(0);
    }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

Python:

```python
import signal
import sys
import time

def handle_sigterm(signum, frame):
    """Handle SIGTERM for graceful shutdown."""
    print("SIGTERM received. Shutting down gracefully...")
    # Clean up resources: close DB connections, flush buffers, etc.
    cleanup()
    sys.exit(0)  # Exit with 0 instead of 143

def cleanup():
    """Clean up application resources."""
    # Close database connections
    # Flush write buffers
    # Save state if needed
    print("Cleanup complete")

# Register the signal handler
signal.signal(signal.SIGTERM, handle_sigterm)
signal.signal(signal.SIGINT, handle_sigterm)

# Main application loop
print("Application started")
while True:
    time.sleep(1)
```

Go:

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
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)

    go func() {
        <-quit
        fmt.Println("SIGTERM received, shutting down...")

        // Give active requests 30 seconds to complete
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        if err := server.Shutdown(ctx); err != nil {
            fmt.Printf("Server forced to shutdown: %v\n", err)
        }
    }()

    fmt.Println("Server starting on :8080")
    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        fmt.Printf("Server error: %v\n", err)
        os.Exit(1)
    }
    fmt.Println("Server stopped cleanly")
}
```

## Fix 3: Use tini as an Init Process

For applications that cannot easily add signal handling, use `tini` as a lightweight init system. Tini runs as PID 1 and properly forwards signals to child processes.

```dockerfile
# Install tini and use it as the entrypoint
FROM node:18-alpine

# Install tini
RUN apk add --no-cache tini

WORKDIR /app
COPY . .
RUN npm install

# Use tini as the init process
ENTRYPOINT ["tini", "--"]
CMD ["node", "server.js"]
```

Docker also has a built-in init process you can enable:

```bash
# Run with Docker's built-in init process
docker run --init myimage
```

In Docker Compose:

```yaml
# docker-compose.yml with init process enabled
services:
  app:
    image: myapp:latest
    init: true  # Enables Docker's built-in tini
```

## Fix 4: Return Exit Code 0 Instead of 143

If your orchestrator treats exit code 143 as a failure and restarts the container, make your application exit with code 0 when it receives SIGTERM.

The signal handlers in the examples above already do this with `process.exit(0)` or `sys.exit(0)`. The key is catching SIGTERM and explicitly choosing your exit code.

For Kubernetes, you can also configure the restart policy to not restart on 143:

```yaml
# Kubernetes pod spec - treat 143 as a success
apiVersion: v1
kind: Pod
spec:
  containers:
    - name: app
      image: myapp:latest
  restartPolicy: OnFailure  # Won't restart if you exit with 0
```

## Fix 5: Increase the Stop Grace Period

If your application needs more time to shut down gracefully, increase the time between SIGTERM and SIGKILL:

```bash
# Give 60 seconds instead of the default 10
docker stop --time=60 my-container
```

```yaml
# docker-compose.yml with extended grace period
services:
  app:
    image: myapp:latest
    stop_grace_period: 60s
```

## Testing SIGTERM Handling

Verify your application handles SIGTERM correctly:

```bash
# Start the container
docker run -d --name test-sigterm myimage

# Wait for it to be ready
sleep 5

# Send SIGTERM directly
docker kill --signal SIGTERM test-sigterm

# Wait a moment, then check the exit code
sleep 5
docker inspect test-sigterm --format '{{.State.ExitCode}}'
# Should be 0 if your handler works correctly
```

## Summary

Exit code 143 means SIGTERM was delivered, which is normal during `docker stop`, Compose restarts, and orchestrator deployments. The exit code itself is not a bug. The problems arise when your application does not handle SIGTERM properly: it drops connections, corrupts data, or your orchestrator treats 143 as a failure. Fix this by using exec form for CMD/ENTRYPOINT so your process runs as PID 1 and receives signals directly. Add SIGTERM handlers to your application code that perform cleanup and exit with code 0. If you cannot modify the application, use `tini` or Docker's `--init` flag to handle signal forwarding. Always test your shutdown behavior by sending SIGTERM manually and verifying the exit code and cleanup behavior.
