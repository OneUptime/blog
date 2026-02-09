# How to Implement Pre-Stop Hooks for Zero-Connection-Drop Deployments in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, PreStop Hooks, Zero Downtime, Lifecycle Management

Description: Configure preStop hooks that coordinate graceful shutdown across load balancers, service meshes, and applications to achieve truly zero-connection-drop deployments in Kubernetes.

---

PreStop hooks execute before Kubernetes sends SIGTERM to containers, providing a window to coordinate graceful shutdown. Without preStop hooks, containers receive SIGTERM immediately after being marked for deletion, but load balancers and service meshes may still route traffic to them for several seconds. This timing mismatch causes connection errors during deployments.

The preStop hook delays container termination while external systems update routing tables. This coordination ensures that by the time SIGTERM arrives, no new connections are being routed to the container. The container can then drain existing connections without receiving new ones, achieving zero connection drops.

Implementing effective preStop hooks requires understanding the latency of various systems (load balancers, DNS, service mesh) and configuring appropriate delays.

## Understanding PreStop Hook Timing

The termination sequence with preStop hooks:

1. Pod marked for deletion
2. Removed from endpoints
3. PreStop hook executes (blocks SIGTERM)
4. External systems update (load balancers, service mesh)
5. PreStop hook completes
6. SIGTERM sent to container
7. Application drains connections
8. Container exits or SIGKILL after grace period

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-service
spec:
  replicas: 3
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: web
        image: web-service:v1.0.0
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - sleep 20
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
```

The 20-second sleep gives load balancers and service mesh time to stop routing traffic before SIGTERM arrives.

## Coordinating with Cloud Load Balancers

Cloud load balancers typically take 15-30 seconds to remove targets from rotation after endpoints change. PreStop hooks account for this delay:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-service
  annotations:
    # AWS: Connection draining timeout
    service.beta.kubernetes.io/aws-load-balancer-connection-draining-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-connection-draining-timeout: "30"
    # GCP: Connection draining timeout
    cloud.google.com/backend-timeout: "30"
spec:
  type: LoadBalancer
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 75
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
                # Wait for load balancer deregistration
                sleep 35
```

The preStop sleep (35s) exceeds the load balancer deregistration timeout (30s), ensuring complete deregistration before SIGTERM.

## Implementing Application-Level Readiness Control

Applications can fail readiness checks immediately in preStop, accelerating removal from service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smart-shutdown
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 60
      containers:
      - name: app
        image: app:v1.0.0
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Signal app to fail readiness checks
                curl -X POST localhost:8080/shutdown
                # Wait for deregistration
                sleep 25
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
```

Application implements shutdown endpoint:

```go
package main

import (
    "net/http"
    "sync/atomic"
)

var shuttingDown int32

func readyHandler(w http.ResponseWriter, r *http.Request) {
    if atomic.LoadInt32(&shuttingDown) == 1 {
        w.WriteHeader(http.StatusServiceUnavailable)
        return
    }
    w.WriteHeader(http.StatusOK)
}

func shutdownHandler(w http.ResponseWriter, r *http.Request) {
    atomic.StoreInt32(&shuttingDown, 1)
    w.WriteHeader(http.StatusOK)
}

func main() {
    http.HandleFunc("/ready", readyHandler)
    http.HandleFunc("/shutdown", shutdownHandler)
    http.ListenAndServe(":8080", nil)
}
```

When preStop calls `/shutdown`, readiness checks immediately start failing, quickly removing the pod from service.

## Service Mesh Integration

Service meshes like Istio need coordination to stop routing traffic:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mesh-service
spec:
  template:
    metadata:
      annotations:
        # Istio: Graceful shutdown
        proxy.istio.io/config: |
          terminationDrainDuration: 30s
    spec:
      terminationGracePeriodSeconds: 75
      containers:
      - name: app
        image: app:v1.0.0
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Notify Envoy sidecar to drain
                curl -X POST localhost:15000/drain_listeners?inboundonly
                # Wait for Envoy to stop accepting connections
                sleep 5
                # Wait for routing updates to propagate
                sleep 30
```

This coordinates with Istio's Envoy sidecar to drain connections before SIGTERM.

## Handling Database Connection Pools

Applications with database connections need graceful pool shutdown:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db-client
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 90
      containers:
      - name: app
        image: app:v1.0.0
        lifecycle:
          preStop:
            exec:
              command:
              - /bin/sh
              - -c
              - |
                # Stop accepting new requests
                curl -X POST localhost:8080/shutdown
                # Wait for load balancer update
                sleep 20
                # Drain database connection pool
                curl -X POST localhost:8080/drain-connections
                # Wait for active queries to complete
                sleep 30
```

Application implements connection draining:

```python
import signal
import time
from flask import Flask
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

app = Flask(__name__)
engine = create_engine(
    'postgresql://user:pass@db/dbname',
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20
)

shutting_down = False

@app.route('/ready')
def ready():
    if shutting_down:
        return '', 503
    return 'OK', 200

@app.route('/shutdown', methods=['POST'])
def shutdown():
    global shutting_down
    shutting_down = True
    return 'Shutdown initiated', 200

@app.route('/drain-connections', methods=['POST'])
def drain_connections():
    # Close all connections in pool
    engine.dispose()
    return 'Connections drained', 200

def signal_handler(sig, frame):
    print('SIGTERM received, draining...')
    global shutting_down
    shutting_down = True
    time.sleep(30)
    engine.dispose()

signal.signal(signal.SIGTERM, signal_handler)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Testing PreStop Hook Effectiveness

Verify that preStop hooks prevent connection drops:

```bash
#!/bin/bash
# test-prestop.sh

NAMESPACE="production"
DEPLOYMENT="web-service"
SERVICE_URL="http://web-service.$NAMESPACE.svc.cluster.local"

echo "Testing preStop hook effectiveness..."

# Start continuous requests
(
  while true; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $SERVICE_URL)
    if [ "$RESPONSE" != "200" ]; then
      echo "$(date): Failed request with status $RESPONSE"
    fi
    sleep 0.1
  done
) &
REQUEST_PID=$!

# Wait a bit
sleep 5

# Trigger rolling update
echo "Starting rolling update..."
kubectl set image deployment/$DEPLOYMENT -n $NAMESPACE \
  web=web-service:v1.0.1

# Monitor for errors
sleep 60

# Stop requests
kill $REQUEST_PID

echo "Test complete. Check output for failed requests."
```

Monitor connection metrics:

```promql
# Failed requests during deployment
rate(http_requests_total{status=~"5.."}[1m])
and on() changes(kube_deployment_status_observed_generation[5m]) > 0

# Connection errors
rate(http_connection_errors_total[1m])
```

## Monitoring PreStop Hook Health

Alert on preStop hook failures:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-alerts
data:
  prestop-alerts.yaml: |
    groups:
    - name: prestop-hooks
      rules:
      - alert: PreStopHookTimeout
        expr: |
          increase(kubelet_runtime_operations_errors_total{
            operation_type="PreStopContainer"
          }[5m]) > 0
        labels:
          severity: warning
        annotations:
          summary: "PreStop hooks timing out"

      - alert: ConnectionDropsDuringDeployment
        expr: |
          rate(http_connection_errors_total[1m]) > 0
          and on() changes(kube_deployment_status_observed_generation[5m]) > 0
        labels:
          severity: critical
        annotations:
          summary: "Connection drops detected during deployment"
```

PreStop hooks are essential for zero-connection-drop deployments. By coordinating graceful shutdown across load balancers, service meshes, and applications, preStop hooks ensure that terminating pods complete all in-flight work before receiving SIGTERM. This transforms rolling updates from potentially disruptive operations into seamless transitions that users never notice.
