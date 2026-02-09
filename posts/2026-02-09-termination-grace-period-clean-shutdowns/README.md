# How to Configure terminationGracePeriodSeconds for Clean Pod Shutdowns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Containers, Best Practices

Description: Learn how to configure Kubernetes terminationGracePeriodSeconds to ensure clean pod shutdowns, graceful connection draining, and proper cleanup during deployments and scaling operations.

---

When Kubernetes terminates a pod, it does not kill it immediately. Instead, it gives the pod time to shut down gracefully. The terminationGracePeriodSeconds setting controls how long Kubernetes waits before forcefully killing a pod. Configuring this properly ensures your applications shut down cleanly without losing data or dropping connections.

Understanding termination grace periods is essential for building reliable applications that handle shutdowns correctly, drain connections, save state, and clean up resources before stopping.

## Understanding the Termination Sequence

When Kubernetes decides to terminate a pod, it follows a specific sequence:

1. Pod status changes to Terminating
2. PreStop hook executes (if configured)
3. SIGTERM signal is sent to containers
4. Kubernetes waits up to terminationGracePeriodSeconds
5. If containers are still running, SIGKILL is sent

The default grace period is 30 seconds. Applications must complete their shutdown within this time or they will be forcefully killed.

## Basic Configuration

Set terminationGracePeriodSeconds in your pod spec:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: graceful-pod
spec:
  terminationGracePeriodSeconds: 60
  containers:
  - name: app
    image: myapp:latest
```

This gives the pod 60 seconds to shut down gracefully.

For deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: web
        image: web:v1.0.0
```

All pods created by this deployment get a 45-second grace period.

## Calculating the Right Grace Period

The grace period must be long enough for your application to complete shutdown tasks. Calculate it based on:

1. PreStop hook duration
2. Time to stop accepting new connections
3. Time for active requests to complete
4. Time for cleanup tasks (flush buffers, save state)
5. Add a safety buffer

Example calculation:

```
PreStop hook: 10 seconds (deregister from load balancer)
Stop accepting connections: 2 seconds
Drain active connections: 20 seconds (max request duration)
Cleanup tasks: 5 seconds
Buffer: 8 seconds
---
Total: 45 seconds
```

Set terminationGracePeriodSeconds to 45 or higher.

## Handling SIGTERM in Applications

Applications must handle SIGTERM signals to shut down gracefully. Here is how to do it in different languages.

Node.js example:

```javascript
const express = require('express');
const app = express();

let server;
let isShuttingDown = false;

app.get('/health', (req, res) => {
  if (isShuttingDown) {
    return res.status(503).send('Shutting down');
  }
  res.status(200).send('OK');
});

app.get('/', (req, res) => {
  res.send('Hello World');
});

server = app.listen(3000, () => {
  console.log('Server listening on port 3000');
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('SIGTERM received, starting graceful shutdown');
  isShuttingDown = true;

  // Stop accepting new connections
  server.close(() => {
    console.log('Server closed, exiting');
    process.exit(0);
  });

  // Force shutdown after grace period
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 40000); // 40 seconds, less than terminationGracePeriodSeconds
});
```

Python Flask example:

```python
from flask import Flask
import signal
import sys
import time

app = Flask(__name__)
is_shutting_down = False

@app.route('/health')
def health():
    if is_shutting_down:
        return 'Shutting down', 503
    return 'OK', 200

@app.route('/')
def index():
    return 'Hello World'

def graceful_shutdown(signum, frame):
    global is_shutting_down
    print('SIGTERM received, starting graceful shutdown')
    is_shutting_down = True

    # Give time for active requests to complete
    time.sleep(5)

    print('Shutdown complete')
    sys.exit(0)

signal.signal(signal.SIGTERM, graceful_shutdown)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

Go example:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello World"))
    })

    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }

    // Start server in goroutine
    go func() {
        log.Println("Server listening on :8080")
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for SIGTERM
    sigterm := make(chan os.Signal, 1)
    signal.Notify(sigterm, syscall.SIGTERM, syscall.SIGINT)
    <-sigterm

    log.Println("SIGTERM received, starting graceful shutdown")

    // Create shutdown context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Shutdown server gracefully
    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Shutdown error: %v", err)
    }

    log.Println("Shutdown complete")
}
```

## Combining with PreStop Hooks

Use PreStop hooks with appropriate grace periods:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: web-app
spec:
  terminationGracePeriodSeconds: 60
  containers:
  - name: app
    image: web:latest
    lifecycle:
      preStop:
        exec:
          command:
          - /bin/sh
          - -c
          - |
            # Fail health check endpoint
            curl -X POST http://localhost:8080/shutdown-healthcheck
            # Wait for load balancer to remove pod
            sleep 15
```

The PreStop hook must complete within the grace period. In this example:
- PreStop takes 15 seconds
- Leaves 45 seconds for SIGTERM handling
- Total: 60 seconds

## Real-World Example: Web Service

Complete configuration for a web service with proper termination:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 5
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      terminationGracePeriodSeconds: 90
      containers:
      - name: api
        image: api:v2.0.0
        ports:
        - containerPort: 8080
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Stop health check (removes from load balancer)
                kill -USR1 1

                # Wait for load balancer
                sleep 20

                # Start connection draining
                kill -USR2 1

                echo "PreStop complete"
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 8080
          periodSeconds: 5
        livenessProbe:
          httpGet:
            path: /health/live
            port: 8080
          periodSeconds: 10
      terminationGracePeriodSeconds: 90
```

Matching application code handles the signals:

```javascript
// Handle USR1: Stop health checks
process.on('SIGUSR1', () => {
  console.log('Stopping health checks');
  healthCheckEnabled = false;
});

// Handle USR2: Start draining
process.on('SIGUSR2', () => {
  console.log('Starting connection drain');
  isDraining = true;
});

// Handle SIGTERM: Final shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received');

  // Wait for active connections
  server.close(() => {
    console.log('All connections closed');

    // Cleanup
    database.close();
    cache.disconnect();

    process.exit(0);
  });

  // Force exit if taking too long
  setTimeout(() => {
    console.error('Forced exit');
    process.exit(1);
  }, 60000);
});
```

## Database Connections and Long Operations

For applications with database connections or long-running operations, increase the grace period:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 300  # 5 minutes
      containers:
      - name: processor
        image: data-processor:latest
        command:
        - python
        - process.py
      restartPolicy: Never
```

Application handles SIGTERM during processing:

```python
import signal
import sys
import time

processing = False
should_stop = False

def signal_handler(signum, frame):
    global should_stop
    print('SIGTERM received, finishing current batch')
    should_stop = True

signal.signal(signal.SIGTERM, signal_handler)

def process_data():
    global processing
    for batch in get_batches():
        if should_stop:
            print('Stopping after current batch')
            break

        processing = True
        process_batch(batch)
        processing = False

    # Clean up
    db.commit()
    db.close()
    print('Graceful shutdown complete')

process_data()
```

## Monitoring Termination Behavior

Watch pod termination events:

```bash
kubectl get events --watch --field-selector reason=Killing
```

Check if pods are being forcefully killed (SIGKILL sent):

```bash
kubectl get events | grep "Container.*will be stopped"
```

If you see "Container will be stopped after grace period", pods are not shutting down within the grace period.

View pod termination logs:

```bash
kubectl logs -f my-pod --previous
```

The `--previous` flag shows logs from the terminated container.

Track termination duration:

```bash
# Add timestamp to pod annotations
metadata:
  annotations:
    shutdown-start: "2026-02-09T10:15:30Z"
```

Use admission webhooks or controllers to automatically add shutdown timestamps.

## Troubleshooting Termination Issues

If pods are forcefully killed before completing shutdown:

1. Increase terminationGracePeriodSeconds
2. Optimize shutdown code to complete faster
3. Check if PreStop hooks are timing out

Test termination locally:

```bash
# Start your application
./app &
APP_PID=$!

# Send SIGTERM
kill -TERM $APP_PID

# Wait and observe
wait $APP_PID
echo "Exit code: $?"
```

Verify the application shuts down within expected time.

Test in Kubernetes:

```bash
# Create test pod
kubectl run test-shutdown --image=myapp:latest --overrides='
{
  "spec": {
    "terminationGracePeriodSeconds": 60
  }
}'

# Delete and watch logs
kubectl delete pod test-shutdown --grace-period=60 &
kubectl logs -f test-shutdown
```

## StatefulSet Considerations

StatefulSets often need longer grace periods for orderly shutdown:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      terminationGracePeriodSeconds: 120
      containers:
      - name: postgres
        image: postgres:14
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Stop accepting connections
                pg_ctl stop -m fast -t 90
```

The database needs time to:
- Stop accepting new connections
- Complete active transactions
- Flush write-ahead logs
- Close connections cleanly

## Best Practices

Set grace periods based on actual measurement, not guesswork. Monitor how long shutdown takes in production.

Always handle SIGTERM in your applications. Ignoring SIGTERM leads to forceful kills and data loss.

Use PreStop hooks for external coordination (load balancer deregistration) before SIGTERM handling.

Test termination behavior during development. Do not wait until production to discover shutdown issues.

Add logging to shutdown code to understand what happens during termination.

Set grace periods higher than strictly necessary. A 10-second buffer provides safety margin.

For critical data operations, implement checkpointing so work can resume after restart.

Monitor forced kills (SIGKILL) as a metric. High rates indicate grace periods are too short.

## Conclusion

Proper terminationGracePeriodSeconds configuration is essential for clean pod shutdowns. Calculate grace periods based on PreStop duration, connection draining time, and cleanup tasks, then add a buffer.

Implement SIGTERM handlers in your applications to shut down gracefully. Use PreStop hooks for external coordination. Test termination behavior thoroughly before deploying to production.

Monitor termination events and logs to identify issues. Increase grace periods for applications with long-running operations or complex shutdown sequences.

Master graceful termination to build reliable applications that handle shutdowns cleanly without losing data or dropping connections.
