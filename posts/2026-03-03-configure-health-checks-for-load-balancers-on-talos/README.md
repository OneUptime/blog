# How to Configure Health Checks for Load Balancers on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Health Check, Load Balancing, Kubernetes, Monitoring, Reliability

Description: Set up comprehensive health checks for load balancers on Talos Linux to ensure traffic only reaches healthy endpoints and failed nodes are removed quickly.

---

A load balancer is only as good as its health checks. Without proper health checking, your load balancer will happily send traffic to crashed pods, overloaded nodes, or misconfigured services. On Talos Linux clusters, health checks operate at multiple layers: Kubernetes probes check pod health, load balancer health checks verify node and service reachability, and external monitors validate the entire path. Getting all these layers right ensures your applications stay available.

## Health Check Layers

In a typical Talos Linux setup, health checks happen at four levels:

1. Kubernetes liveness and readiness probes (pod level)
2. Service endpoint health (kube-proxy level)
3. Load balancer health checks (MetalLB, HAProxy, cloud LB)
4. External monitoring (uptime checks from outside)

Each layer serves a different purpose, and you need all of them for reliable service delivery.

## Kubernetes Probes

Kubernetes probes are the foundation. They determine whether a pod should receive traffic (readiness) and whether it should be restarted (liveness).

### HTTP Health Checks

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: my-app:latest
        ports:
        - containerPort: 8080
        # Readiness probe - controls whether pod receives traffic
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        # Liveness probe - controls whether pod gets restarted
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 15
          periodSeconds: 20
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        # Startup probe - gives slow-starting apps time to initialize
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          failureThreshold: 30
          periodSeconds: 10
```

### TCP Health Checks

For services that do not have HTTP endpoints (databases, message brokers):

```yaml
readinessProbe:
  tcpSocket:
    port: 5432
  initialDelaySeconds: 5
  periodSeconds: 10
livenessProbe:
  tcpSocket:
    port: 5432
  initialDelaySeconds: 15
  periodSeconds: 20
```

### Command-Based Health Checks

For custom health validation:

```yaml
readinessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - pg_isready -U postgres -d mydb
  initialDelaySeconds: 5
  periodSeconds: 10
livenessProbe:
  exec:
    command:
    - /bin/sh
    - -c
    - pg_isready -U postgres -d mydb && test $(psql -U postgres -d mydb -t -c "SELECT 1") = "1"
  initialDelaySeconds: 15
  periodSeconds: 30
```

### gRPC Health Checks

For gRPC services:

```yaml
readinessProbe:
  grpc:
    port: 50051
    service: myservice
  initialDelaySeconds: 5
  periodSeconds: 10
```

## Implementing Health Check Endpoints

Your application should expose meaningful health check endpoints, not just return 200 OK for everything:

```python
# Python Flask example of a proper health check endpoint
from flask import Flask, jsonify
import psycopg2
import redis

app = Flask(__name__)

@app.route('/health')
def health():
    """Basic health - is the process alive?"""
    return jsonify({"status": "ok"}), 200

@app.route('/ready')
def ready():
    """Readiness - can this instance handle traffic?"""
    checks = {}

    # Check database connectivity
    try:
        conn = psycopg2.connect(host="postgres.data", dbname="mydb")
        conn.close()
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = str(e)
        return jsonify({"status": "not ready", "checks": checks}), 503

    # Check Redis connectivity
    try:
        r = redis.Redis(host="redis.cache")
        r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        checks["redis"] = str(e)
        return jsonify({"status": "not ready", "checks": checks}), 503

    return jsonify({"status": "ready", "checks": checks}), 200
```

## MetalLB Health Check Integration

MetalLB itself does not perform application-level health checks. It relies on Kubernetes readiness probes to determine which pods should receive traffic. When a pod fails its readiness probe, Kubernetes removes it from the service endpoints, and MetalLB (through kube-proxy) stops sending traffic to it.

However, MetalLB does need to know which nodes are healthy for leader election:

```bash
# Check MetalLB speaker health on all nodes
kubectl get pods -n metallb-system -l app.kubernetes.io/component=speaker -o wide

# View speaker logs for health-related messages
kubectl logs -n metallb-system -l app.kubernetes.io/component=speaker --tail=20
```

## HAProxy Health Checks for Talos Nodes

If you are using an external HAProxy in front of your Talos cluster, configure thorough backend health checks:

```text
# HAProxy configuration with comprehensive health checks

backend k8s-api
    mode tcp
    option tcp-check
    # TCP check verifies the port is open and responding
    tcp-check connect port 6443 ssl
    balance roundrobin
    server cp-1 10.0.0.10:6443 check inter 5s fall 3 rise 2
    server cp-2 10.0.0.11:6443 check inter 5s fall 3 rise 2
    server cp-3 10.0.0.12:6443 check inter 5s fall 3 rise 2

backend app-workers
    mode http
    option httpchk GET /healthz HTTP/1.1\r\nHost:\ health.local

    # Health check response validation
    http-check expect status 200

    # Connection settings
    default-server inter 10s downinter 5s rise 3 fall 3 maxconn 256 slowstart 30s

    # Agent check - external health check endpoint
    server worker-1 10.0.0.20:30080 check agent-check agent-port 8888 agent-inter 5s
    server worker-2 10.0.0.21:30080 check agent-check agent-port 8888 agent-inter 5s
    server worker-3 10.0.0.22:30080 check agent-check agent-port 8888 agent-inter 5s
```

### HAProxy Health Check Parameters Explained

```text
# inter 10s     - Check every 10 seconds when server is up
# downinter 5s  - Check every 5 seconds when server is down (faster recovery)
# rise 3        - Server needs 3 consecutive successes to be marked up
# fall 3        - Server needs 3 consecutive failures to be marked down
# slowstart 30s - Gradually increase traffic to recovered server over 30s
```

## Ingress Controller Health Checks

Configure health checks at the ingress level for finer-grained control:

```yaml
# Nginx Ingress with custom health check annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    nginx.ingress.kubernetes.io/health-check-path: /ready
    nginx.ingress.kubernetes.io/health-check-interval: "10"
    nginx.ingress.kubernetes.io/health-check-timeout: "5"
    nginx.ingress.kubernetes.io/upstream-hash-by: "$remote_addr"
spec:
  ingressClassName: nginx
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app
            port:
              number: 80
```

## Talos Node Health Checks

Monitor the health of Talos Linux nodes themselves:

```bash
#!/bin/bash
# check-talos-health.sh
# Validates Talos node health

NODES=$(kubectl get nodes -o jsonpath='{.items[*].status.addresses[?(@.type=="InternalIP")].address}')

for node in $NODES; do
    echo "Checking node: $node"

    # Check Talos API health
    TALOS_HEALTH=$(talosctl health --nodes "$node" --wait-timeout 10s 2>&1)
    if echo "$TALOS_HEALTH" | grep -q "healthcheck error"; then
        echo "  TALOS: UNHEALTHY"
    else
        echo "  TALOS: OK"
    fi

    # Check kubelet health
    KUBELET=$(talosctl service kubelet --nodes "$node" 2>/dev/null | grep "STATE" | awk '{print $NF}')
    echo "  KUBELET: $KUBELET"

    # Check etcd health (control plane only)
    ETCD=$(talosctl service etcd --nodes "$node" 2>/dev/null | grep "STATE" | awk '{print $NF}')
    if [ -n "$ETCD" ]; then
        echo "  ETCD: $ETCD"
    fi

    echo ""
done
```

## Graceful Degradation with Health Checks

Design your health checks to support graceful degradation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: app
        # Readiness probe that checks dependencies
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 5
          failureThreshold: 1   # Quickly stop traffic on failure
          successThreshold: 1   # Quickly resume traffic on recovery

        # Liveness probe that only checks if the process is alive
        livenessProbe:
          httpGet:
            path: /alive
            port: 8080
          periodSeconds: 30
          failureThreshold: 5   # Be patient before restarting
          successThreshold: 1

      # PreStop hook for graceful shutdown
      lifecycle:
        preStop:
          exec:
            command: ["/bin/sh", "-c", "sleep 10"]
```

The separation between `/ready` and `/alive` is important. The readiness probe should fail when the pod cannot serve traffic (dependency down, overloaded). The liveness probe should only fail when the process is truly stuck and needs a restart.

## Alerting on Health Check Failures

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: health-check-alerts
  namespace: monitoring
spec:
  groups:
  - name: health-checks
    rules:
    - alert: PodReadinessFlapping
      expr: |
        changes(kube_pod_status_ready{condition="true"}[15m]) > 5
      labels:
        severity: warning
      annotations:
        summary: "Pod readiness is flapping"

    - alert: EndpointsNotReady
      expr: |
        kube_endpoint_address_not_ready > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Service has not-ready endpoints for over 10 minutes"

    - alert: NoHealthyBackends
      expr: |
        kube_endpoint_address_available == 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Service has no healthy backends"
```

## Wrapping Up

Health checks for load balancers on Talos Linux are a multi-layered concern. Kubernetes probes handle pod-level health, kube-proxy removes unhealthy endpoints from service rotation, external load balancers verify node-level reachability, and monitoring systems watch the whole stack. Design your health check endpoints to be meaningful - they should test actual dependencies, not just return 200. And always set up alerting so you know when health checks are failing before your users do.
