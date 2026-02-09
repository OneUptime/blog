# How to Implement Kubernetes ExternalTrafficPolicy Local to Preserve Client Source IP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Networking, LoadBalancer, Service, IP

Description: Configure Kubernetes ExternalTrafficPolicy Local to preserve client source IP addresses for services, enabling accurate logging, security policies, and geographic routing while understanding the tradeoffs.

---

By default, Kubernetes services use SNAT (Source Network Address Translation) for external traffic, replacing the original client IP with the node IP. This breaks applications that need the real client IP for logging, rate limiting, geographic routing, or security policies. Setting ExternalTrafficPolicy to Local preserves the source IP but introduces tradeoffs.

This guide explains how ExternalTrafficPolicy works, when to use Local versus Cluster mode, how to configure it correctly, and how to handle the operational implications.

## Understanding ExternalTrafficPolicy

Kubernetes services support two ExternalTrafficPolicy modes:

**Cluster (default)**: Traffic can route to any node, then to any pod. Source IP is lost due to SNAT.

**Local**: Traffic only routes to pods on the receiving node. Source IP is preserved but load balancing is uneven.

The choice impacts:
- Client IP visibility
- Load distribution
- Health checking behavior
- Failover characteristics

## How Source IP Preservation Works

With ExternalTrafficPolicy: Cluster:

1. Client sends request to LoadBalancer IP
2. LoadBalancer routes to any node
3. Node performs SNAT, replacing source IP with node IP
4. Request forwards to pod (possibly on another node)
5. Pod sees node IP, not client IP

With ExternalTrafficPolicy: Local:

1. Client sends request to LoadBalancer IP
2. LoadBalancer routes only to nodes with pods
3. Node forwards directly to local pod without SNAT
4. Pod sees original client IP

## Configuring ExternalTrafficPolicy Local

Create a service with Local policy:

```yaml
# service-local.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
  selector:
    app: web
```

Apply the configuration:

```bash
kubectl apply -f service-local.yaml
```

Verify the policy:

```bash
kubectl get svc web-service -o jsonpath='{.spec.externalTrafficPolicy}'
```

## Understanding Health Check Implications

With ExternalTrafficPolicy: Local, Kubernetes creates node-level health checks:

```yaml
# The service automatically gets health check node ports
apiVersion: v1
kind: Service
metadata:
  name: web-service
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  healthCheckNodePort: 32000  # Automatically assigned if not specified
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
```

The health check endpoint reports healthy only if pods exist on that node.

Check the health check port:

```bash
# Get the health check port
kubectl get svc web-service -o jsonpath='{.spec.healthCheckNodePort}'

# Test health check endpoint
curl http://<node-ip>:32000/healthz
```

## Handling Uneven Load Distribution

ExternalTrafficPolicy: Local causes uneven load distribution:

```yaml
# Example: 3 nodes with different pod counts
# Node 1: 5 pods - receives ~50% of traffic
# Node 2: 3 pods - receives ~30% of traffic
# Node 3: 2 pods - receives ~20% of traffic
```

Mitigate with pod anti-affinity:

```yaml
# deployment-with-spread.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 15
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: web
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchLabels:
                  app: web
              topologyKey: kubernetes.io/hostname
      containers:
      - name: web
        image: nginx:latest
        ports:
        - containerPort: 8080
```

## Implementing Client IP-Based Features

Use the preserved source IP for rate limiting:

```nginx
# nginx.conf
http {
    geo $is_trusted_ip {
        default 0;
        10.0.0.0/8 1;
        172.16.0.0/12 1;
        192.168.0.0/16 1;
    }

    limit_req_zone $binary_remote_addr zone=client_limit:10m rate=10r/s;

    server {
        listen 8080;

        # Real client IP is in the connection, not X-Forwarded-For
        location / {
            limit_req zone=client_limit burst=20 nodelay;

            if ($is_trusted_ip = 0) {
                # Apply stricter limits for external clients
                limit_req zone=client_limit burst=5;
            }

            proxy_pass http://backend;
        }
    }
}
```

Implement IP-based access control:

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-specific-clients
spec:
  podSelector:
    matchLabels:
      app: web
  policyTypes:
  - Ingress
  ingress:
  - from:
    - ipBlock:
        cidr: 203.0.113.0/24  # Trusted client network
    ports:
    - protocol: TCP
      port: 8080
```

## Logging Client IPs

Configure application logging to capture real IPs:

```javascript
// Express.js example
const express = require('express');
const app = express();

app.use((req, res, next) => {
  // With ExternalTrafficPolicy: Local, req.ip contains real client IP
  // No need to parse X-Forwarded-For
  const clientIP = req.ip;

  console.log(`Request from ${clientIP}: ${req.method} ${req.path}`);

  // Add to request object for downstream handlers
  req.clientIP = clientIP;

  next();
});

app.get('/', (req, res) => {
  res.json({
    message: 'Hello',
    yourIP: req.clientIP
  });
});

app.listen(8080);
```

Python Flask example:

```python
# app.py
from flask import Flask, request
import logging

app = Flask(__name__)

@app.before_request
def log_request():
    # With ExternalTrafficPolicy: Local, request.remote_addr is real IP
    client_ip = request.remote_addr
    logging.info(f"Request from {client_ip}: {request.method} {request.path}")

@app.route('/')
def index():
    return {
        'message': 'Hello',
        'yourIP': request.remote_addr
    }

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

## Comparing Policy Modes

Create both modes for testing:

```yaml
# service-comparison.yaml
apiVersion: v1
kind: Service
metadata:
  name: web-cluster-policy
spec:
  type: LoadBalancer
  externalTrafficPolicy: Cluster
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web

---
apiVersion: v1
kind: Service
metadata:
  name: web-local-policy
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  ports:
  - port: 80
    targetPort: 8080
  selector:
    app: web
```

Test source IP visibility:

```bash
# Test Cluster policy
curl http://<cluster-lb-ip>/

# Test Local policy
curl http://<local-lb-ip>/

# Compare application logs
kubectl logs -l app=web | grep "Request from"
```

## Monitoring and Observability

Track connection distribution:

```bash
#!/bin/bash
# monitor-connections.sh

echo "Connection distribution across nodes"
echo "===================================="

for node in $(kubectl get nodes -o name | cut -d/ -f2); do
    echo "Node: $node"

    # Get pods on this node
    pods=$(kubectl get pods -l app=web --field-selector spec.nodeName=$node -o name)

    if [ -z "$pods" ]; then
        echo "  No pods"
        continue
    fi

    # Count connections to each pod
    for pod in $pods; do
        connections=$(kubectl exec $pod -- netstat -an | grep ESTABLISHED | wc -l)
        echo "  $pod: $connections connections"
    done

    echo ""
done
```

Create Prometheus metrics:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: web-service
spec:
  selector:
    matchLabels:
      app: web
  endpoints:
  - port: metrics
    interval: 30s
```

Example Prometheus queries:

```promql
# Connection rate by client IP
rate(http_requests_total{source_ip!=""}[5m])

# Top clients by request volume
topk(10, sum by (source_ip) (rate(http_requests_total[5m])))

# Geographic distribution (if IP geolocation is enabled)
sum by (country) (rate(http_requests_total[5m]))
```

## Handling Failover Scenarios

Test pod failure:

```bash
#!/bin/bash
# test-failover.sh

SERVICE_IP=$(kubectl get svc web-local-policy -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Testing failover for service at $SERVICE_IP"

# Start monitoring
while true; do
    RESPONSE=$(curl -s -w "%{http_code}" --max-time 2 http://$SERVICE_IP -o /dev/null)
    echo "$(date): HTTP $RESPONSE"
    sleep 1
done &
MONITOR_PID=$!

sleep 5

# Delete a pod
echo "Deleting a pod..."
kubectl delete pod -l app=web --field-selector=status.phase=Running | head -1

# Wait for recovery
sleep 30

# Stop monitoring
kill $MONITOR_PID

echo "Failover test complete"
```

## Best Practices and Recommendations

Use ExternalTrafficPolicy: Local when:
- You need real client IPs for logging or analytics
- You implement IP-based rate limiting
- Geographic routing is required
- Security policies depend on source IP

Use ExternalTrafficPolicy: Cluster when:
- Even load distribution is critical
- You don't need client IPs
- You have highly dynamic pod placement
- Cross-node load balancing is important

Hybrid approach:

```yaml
# Use Local for public-facing APIs
apiVersion: v1
kind: Service
metadata:
  name: public-api
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
  selector:
    app: public-api

---
# Use Cluster for internal services
apiVersion: v1
kind: Service
metadata:
  name: internal-api
spec:
  type: LoadBalancer
  externalTrafficPolicy: Cluster
  selector:
    app: internal-api
```

## Troubleshooting

Common issues:

```bash
# Health check failures
kubectl get svc web-local-policy -o jsonpath='{.spec.healthCheckNodePort}'
curl http://<node-ip>:<health-check-port>/healthz

# Uneven traffic distribution
kubectl get pods -l app=web -o wide
# Check pod distribution across nodes

# Missing source IP
kubectl logs -l app=web | grep "Request from"
# Verify pods see real IPs, not node IPs

# LoadBalancer not routing traffic
kubectl describe svc web-local-policy
# Check for events and external IP assignment
```

ExternalTrafficPolicy: Local preserves client source IP addresses but requires careful configuration and monitoring. Use it when client IP visibility justifies the operational complexity and potential load imbalance.
