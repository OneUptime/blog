# How to Implement Connection Draining for Kubernetes Services During Rolling Updates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Connection Draining, Rolling Updates, Zero Downtime

Description: Implement connection draining strategies that allow in-flight requests to complete gracefully during rolling updates, preventing connection errors and ensuring zero-downtime deployments.

---

Rolling updates replace pods gradually, but without proper connection draining, terminating pods close active connections abruptly. Users experience failed requests, timeouts, and errors during deployments that should be seamless. Connection draining ensures that pods stop accepting new connections while allowing existing connections to complete naturally.

The challenge is coordinating multiple systems. Load balancers need time to remove pods from rotation. Applications need time to finish processing requests. Kubernetes needs to wait for this drainage before forcefully terminating pods. Each component must work together to achieve truly zero-downtime updates.

Proper connection draining involves configuring preStop hooks, setting appropriate termination grace periods, implementing graceful shutdown in applications, and coordinating with external load balancers.

## Understanding Connection Lifecycle During Updates

During rolling updates, Kubernetes creates new pods before terminating old ones. The termination process must drain connections without dropping requests.

The sequence is:
1. Pod marked for deletion
2. Removed from endpoints (stops receiving new traffic)
3. PreStop hook executes
4. SIGTERM sent to application
5. Grace period countdown begins
6. Existing connections drain
7. SIGKILL forces termination if grace period expires

Configure deployments with appropriate settings:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
  namespace: production
spec:
  replicas: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: web-service
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: web
        image: web-service:v1.0.0
        ports:
        - containerPort: 8080
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - sleep 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
```

The `maxUnavailable: 0` ensures no existing pods terminate until replacements are ready. The preStop hook delays SIGTERM, giving load balancers time to update.

## Implementing Application-Level Connection Draining

Applications must handle SIGTERM by stopping new connection acceptance while draining existing connections.

Go HTTP server with connection draining:

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
    mux := http.NewServeMux()

    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        // Simulate request processing
        time.Sleep(2 * time.Second)
        w.Write([]byte("Response"))
    })

    mux.HandleFunc("/ready", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    server := &http.Server{
        Addr:    ":8080",
        Handler: mux,
    }

    // Start server in goroutine
    go func() {
        fmt.Println("Server starting on :8080")
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            fmt.Printf("Server error: %v\n", err)
        }
    }()

    // Wait for termination signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit

    fmt.Println("Shutting down server...")

    // Create shutdown context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 45*time.Second)
    defer cancel()

    // Graceful shutdown drains connections
    if err := server.Shutdown(ctx); err != nil {
        fmt.Printf("Server shutdown error: %v\n", err)
    }

    fmt.Println("Server stopped")
}
```

Node.js Express server with connection draining:

```javascript
const express = require('express');
const http = require('http');

const app = express();
const server = http.createServer(app);

let connections = new Set();

// Track all connections
server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => {
    connections.delete(conn);
  });
});

app.get('/', (req, res) => {
  // Simulate work
  setTimeout(() => {
    res.send('Response');
  }, 2000);
});

app.get('/ready', (req, res) => {
  res.sendStatus(200);
});

server.listen(8080, () => {
  console.log('Server listening on port 8080');
});

// Handle shutdown signals
process.on('SIGTERM', () => {
  console.log('SIGTERM received, draining connections...');

  // Stop accepting new connections
  server.close(() => {
    console.log('Server closed, all connections drained');
    process.exit(0);
  });

  // Force close after timeout
  setTimeout(() => {
    console.log('Forcing shutdown...');
    connections.forEach(conn => conn.destroy());
    process.exit(1);
  }, 45000);
});
```

## Coordinating with Load Balancers

External load balancers need time to stop routing traffic to terminating pods. The preStop hook provides this coordination window.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: api
        image: api-service:v1.0.0
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Mark pod as not ready
                curl -X POST localhost:8080/shutdown

                # Wait for load balancer to deregister
                sleep 20

                # Allow ongoing requests to complete
                echo "Draining connections..."
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
          failureThreshold: 1
```

The application implements a shutdown endpoint:

```go
var shuttingDown bool

func readyHandler(w http.ResponseWriter, r *http.Request) {
    if shuttingDown {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
}

func shutdownHandler(w http.ResponseWriter, r *http.Request) {
    shuttingDown = true
    w.WriteHeader(http.StatusOK)
}
```

When the preStop hook calls `/shutdown`, the readiness probe begins failing, removing the pod from service endpoints and load balancer target groups.

## Handling Long-Polling and WebSocket Connections

Long-lived connections like WebSockets require special handling during drainage.

```go
type ConnectionManager struct {
    connections map[string]*websocket.Conn
    mu          sync.RWMutex
    draining    bool
}

func (cm *ConnectionManager) Add(id string, conn *websocket.Conn) error {
    cm.mu.Lock()
    defer cm.mu.Unlock()

    if cm.draining {
        return fmt.Errorf("server draining, not accepting connections")
    }

    cm.connections[id] = conn
    return nil
}

func (cm *ConnectionManager) Remove(id string) {
    cm.mu.Lock()
    defer cm.mu.Unlock()
    delete(cm.connections, id)
}

func (cm *ConnectionManager) StartDraining(timeout time.Duration) {
    cm.mu.Lock()
    cm.draining = true
    conns := make([]*websocket.Conn, 0, len(cm.connections))
    for _, conn := range cm.connections {
        conns = append(conns, conn)
    }
    cm.mu.Unlock()

    fmt.Printf("Draining %d connections...\n", len(conns))

    // Notify clients of shutdown
    for _, conn := range conns {
        msg := websocket.FormatCloseMessage(websocket.CloseGoingAway,
            "Server shutting down")
        conn.WriteControl(websocket.CloseMessage, msg, time.Now().Add(time.Second))
    }

    // Wait for connections to close naturally
    deadline := time.Now().Add(timeout)
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for time.Now().Before(deadline) {
        cm.mu.RLock()
        remaining := len(cm.connections)
        cm.mu.RUnlock()

        if remaining == 0 {
            fmt.Println("All connections drained")
            return
        }

        fmt.Printf("%d connections remaining...\n", remaining)
        <-ticker.C
    }

    // Force close remaining connections
    cm.mu.Lock()
    for _, conn := range cm.connections {
        conn.Close()
    }
    cm.mu.Unlock()
}
```

## Testing Connection Draining

Verify connection draining works correctly before relying on it in production:

```bash
#!/bin/bash
# test-connection-draining.sh

DEPLOYMENT="web-service"
NAMESPACE="production"
SERVICE_URL="http://web-service.production.svc.cluster.local"

echo "Starting connection draining test..."

# Start background requests
for i in {1..20}; do
  (
    curl -s -w "\nRequest $i: %{http_code} in %{time_total}s\n" \
      $SERVICE_URL &
  )
  sleep 0.5
done

# Wait a bit for requests to start
sleep 2

# Trigger rolling update
echo "Starting rolling update..."
kubectl set image deployment/$DEPLOYMENT -n $NAMESPACE \
  web=web-service:v1.0.1

# Monitor for failed requests
echo "Monitoring for connection errors..."

# Wait for rollout to complete
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE

echo "Test complete"
```

Monitor connection metrics during updates:

```promql
# Failed requests during deployment
rate(http_requests_total{status=~"5.."}[1m])

# Connection drops
rate(http_connection_errors_total[1m])

# Request latency during update
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[1m]))
```

## Monitoring Connection Draining Effectiveness

Track metrics to verify connection draining prevents errors:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
data:
  connection-alerts.yaml: |
    groups:
    - name: connection-draining
      rules:
      - alert: ConnectionDropsDuringUpdate
        expr: |
          rate(http_connection_errors_total[1m]) > 0
          and
          changes(kube_deployment_status_observed_generation[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "Connections dropping during deployment"

      - alert: HighErrorRateDuringUpdate
        expr: |
          rate(http_requests_total{status=~"5.."}[2m]) /
          rate(http_requests_total[2m]) > 0.01
          and
          changes(kube_deployment_status_observed_generation[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Error rate elevated during deployment"
```

Connection draining is essential for zero-downtime deployments. By coordinating preStop hooks, graceful shutdown, and appropriate grace periods, you ensure that rolling updates complete without dropping connections or failing requests. This transforms deployments from risky operations into routine maintenance that users never notice.
