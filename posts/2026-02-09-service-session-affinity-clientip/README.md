# How to Configure Kubernetes Service Session Affinity with clientIP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Service, Session Affinity, Load Balancing, Networking

Description: Configure session affinity based on client IP addresses in Kubernetes services to ensure requests from the same client consistently reach the same backend pod for stateful applications.

---

Session affinity makes Kubernetes services sticky. Instead of load balancing each request randomly across pods, session affinity ensures requests from the same client always hit the same backend pod. This matters for stateful applications, shopping carts, WebSocket connections, and any scenario where maintaining state on the backend simplifies your architecture.

## Understanding Session Affinity

By default, Kubernetes services distribute traffic randomly across healthy pods. Every request gets load balanced independently. This works great for stateless applications but breaks stateful ones that store session data in memory.

Session affinity changes this behavior. When enabled with clientIP, Kubernetes uses the client's IP address as a sticky key. Requests from the same IP always route to the same pod, as long as that pod remains healthy.

## Enabling Session Affinity

Configure session affinity in your service definition:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: stateful-app
  namespace: production
spec:
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 10800  # 3 hours
  selector:
    app: stateful-app
  ports:
  - port: 80
    targetPort: 8080
    protocol: TCP
```

The key fields:

- `sessionAffinity: ClientIP`: Enable IP-based affinity
- `timeoutSeconds: 10800`: How long the affinity lasts (default: 10800 seconds / 3 hours)

Apply this configuration:

```bash
kubectl apply -f stateful-app-service.yaml
```

Now all requests from the same client IP hit the same pod for 3 hours.

## How It Works Under the Hood

Session affinity implementation depends on your kube-proxy mode.

### iptables Mode

In iptables mode, kube-proxy creates rules with the `--probability` parameter and uses connection tracking. When a client connects, iptables selects a backend using the probability chain, then marks that connection. Subsequent packets from the same source IP within the timeout window match the existing conntrack entry and route to the same backend.

Check the iptables rules:

```bash
# On a node
sudo iptables-save | grep stateful-app
```

You'll see complex chains managing the sticky routing.

### IPVS Mode

In IPVS mode, session affinity uses IPVS's native persistence feature. When you configure clientIP affinity, kube-proxy sets the persistent timeout in IPVS:

```bash
# On a node using IPVS
sudo ipvsadm -L -n
```

Look for the `persistent` flag with the timeout value.

## Testing Session Affinity

Deploy a test application that shows which pod handled the request:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: affinity-test
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: affinity-test
  template:
    metadata:
      labels:
        app: affinity-test
    spec:
      containers:
      - name: app
        image: hashicorp/http-echo
        args:
        - "-text=$(POD_NAME)"
        env:
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: affinity-test
  namespace: default
spec:
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 300
  selector:
    app: affinity-test
  ports:
  - port: 80
    targetPort: 5678
```

Deploy and test:

```bash
kubectl apply -f affinity-test.yaml

# Test from a pod
kubectl run test-client --image=curlimages/curl -it --rm -- sh

# Inside the pod, make multiple requests
for i in {1..10}; do
  curl http://affinity-test.default.svc.cluster.local
  sleep 1
done
```

You should see the same pod name in all responses. Without session affinity, you'd see different pod names.

## Use Cases for Session Affinity

Session affinity solves specific problems:

### WebSocket Connections

WebSocket connections need to stay on the same pod:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: websocket-server
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 86400  # 24 hours for long-lived connections
  selector:
    app: websocket-server
  ports:
  - port: 80
    targetPort: 8080
```

### In-Memory Session Storage

Applications that store sessions in memory without a shared cache:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: legacy-app
spec:
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600  # 1 hour sessions
  selector:
    app: legacy-app
  ports:
  - port: 8080
    targetPort: 8080
```

### File Upload Resumption

Multi-part file uploads that need to resume on the same pod:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: file-upload
spec:
  type: ClusterIP
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 7200  # 2 hours for large uploads
  selector:
    app: file-upload
  ports:
  - port: 80
    targetPort: 3000
```

## Limitations and Caveats

Session affinity has important limitations:

### Uneven Load Distribution

Sticky sessions can create hot spots. If one client makes many requests, its assigned pod gets more load than others. This can lead to resource imbalances.

Monitor pod metrics to detect uneven distribution:

```bash
kubectl top pods -l app=stateful-app
```

### No Failover Awareness

When a pod dies, clients lose their sessions. Kubernetes routes them to a new pod, but any in-memory state is gone. Session affinity doesn't provide high availability for state.

Consider external session storage instead:

```yaml
# Better approach: use Redis for sessions
apiVersion: v1
kind: Service
metadata:
  name: stateless-app
spec:
  type: ClusterIP
  # No session affinity needed
  selector:
    app: stateless-app
  ports:
  - port: 80
    targetPort: 8080
```

```yaml
# Application uses Redis for session storage
apiVersion: apps/v1
kind: Deployment
metadata:
  name: stateless-app
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        env:
        - name: SESSION_STORE
          value: redis
        - name: REDIS_URL
          value: redis://redis-master.default.svc.cluster.local:6379
```

### NAT and Proxy Issues

Session affinity works on the source IP Kubernetes sees. Behind NAT or proxies, many clients may share the same IP, forcing them all to the same pod. Conversely, clients with changing IPs (mobile networks) lose affinity frequently.

### No Cross-Service Affinity

Each service maintains its own affinity table. If you have multiple services, requests to different services don't stick to related pods.

## Combining with External Traffic Policy

For LoadBalancer services, combine session affinity with externalTrafficPolicy for better client IP preservation:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: external-app
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP
  sessionAffinityConfig:
    clientIP:
      timeoutSeconds: 3600
  externalTrafficPolicy: Local  # Preserve client IP
  selector:
    app: external-app
  ports:
  - port: 80
    targetPort: 8080
```

Without `externalTrafficPolicy: Local`, kube-proxy rewrites the source IP, breaking session affinity for external clients.

## Session Affinity with Ingress

Ingress controllers handle session affinity differently. Most support cookie-based affinity instead of IP-based:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/affinity: "cookie"
    nginx.ingress.kubernetes.io/session-cookie-name: "app-affinity"
    nginx.ingress.kubernetes.io/session-cookie-max-age: "3600"
    nginx.ingress.kubernetes.io/session-cookie-expires: "3600"
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: app-service
            port:
              number: 80
```

This creates a cookie that ensures requests from the same browser hit the same pod, working better than IP affinity for web applications.

## Monitoring Session Affinity

Track session affinity effectiveness with custom metrics. Instrument your application to log which pod handles each session:

```python
# Python example
from flask import Flask, request, session
import os
import logging

app = Flask(__name__)
pod_name = os.environ.get('POD_NAME', 'unknown')

@app.route('/')
def handle_request():
    client_ip = request.remote_addr
    session_id = session.get('id', 'new')

    logging.info(f"Request from {client_ip}, session {session_id}, pod {pod_name}")

    return f"Handled by {pod_name}"
```

Analyze logs to verify clients stick to pods:

```bash
kubectl logs -l app=stateful-app | grep "Request from 10.244.1.5" | awk '{print $NF}' | sort | uniq -c
```

You should see most requests from a given IP hitting the same pod.

## Alternatives to Session Affinity

Before using session affinity, consider alternatives:

### External Session Store

Use Redis, Memcached, or a database for sessions:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  template:
    spec:
      containers:
      - name: app
        env:
        - name: SESSION_STORE
          value: "redis"
```

This makes all pods stateless and allows true load balancing.

### Sticky Sessions at Ingress Layer

Let the ingress controller handle stickiness:

```yaml
annotations:
  nginx.ingress.kubernetes.io/affinity: "cookie"
```

This works better than service-level affinity for HTTP traffic.

### Stateful Sets

For truly stateful workloads, use StatefulSets instead:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: stateful-app
spec:
  serviceName: stateful-app
  replicas: 3
  selector:
    matchLabels:
      app: stateful-app
  template:
    metadata:
      labels:
        app: stateful-app
    spec:
      containers:
      - name: app
        image: myapp:latest
```

StatefulSets provide stable network identities and persistent storage, better suited for databases and other stateful applications.

## Best Practices

When using session affinity:

- Set timeoutSeconds based on your session duration needs
- Monitor for uneven load distribution across pods
- Use externalTrafficPolicy: Local for LoadBalancer services
- Consider cookie-based affinity at the ingress layer for HTTP
- Implement health checks so unhealthy pods drop their sessions
- Document why you need affinity (stateful apps should be rare in Kubernetes)
- Prefer external session stores when possible
- Test pod failure scenarios to understand session loss impact
- Set appropriate HPA min/max values to prevent constant pod churn

Session affinity is a useful tool for specific scenarios, but it's not a replacement for proper stateless application design. Use it when necessary, but always prefer architectures that don't require sticky sessions.
