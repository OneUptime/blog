# How to Configure Authorization Policy for Specific Ports

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Ports, Security, Kubernetes

Description: How to write Istio authorization policies that target specific ports, including HTTP ports, TCP ports, and multi-port workloads.

---

Many workloads expose multiple ports. A typical service might have port 8080 for its main API, port 8081 for health checks, port 9090 for Prometheus metrics, and maybe port 5432 for a database sidecar. You do not always want the same authorization rules on every port. Istio lets you write policies that target specific ports, so you can lock down your API port while keeping the metrics port open for your monitoring stack.

## Port-Based Authorization Basics

The `ports` field in an authorization policy's operation section specifies which destination ports the rule applies to:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: api-port-only
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
  - from:
    - source:
        namespaces:
        - "backend"
    to:
    - operation:
        ports:
        - "8080"
```

This allows traffic from the `backend` namespace only on port 8080. If the same workload exposes port 9090 for metrics, that port is not affected by this specific rule. However, because this is an ALLOW policy, and no other ALLOW rule covers port 9090, traffic to 9090 would also be denied.

## Allowing Different Access per Port

The real power comes when you write separate rules for different ports:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: multi-port-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
  # Main API - restricted to backend services
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/api-gateway"
    to:
    - operation:
        ports:
        - "8080"
  # Metrics port - open to monitoring
  - from:
    - source:
        principals:
        - "cluster.local/ns/monitoring/sa/prometheus"
    to:
    - operation:
        ports:
        - "9090"
  # Health check port - open to anyone in mesh
  - from:
    - source:
        principals:
        - "*"
    to:
    - operation:
        ports:
        - "8081"
```

This gives you three different access levels on three different ports. The API gateway can reach port 8080, Prometheus can scrape port 9090, and any authenticated mesh workload can hit the health check on port 8081.

## Excluding Specific Ports

You can use `notPorts` to write rules that apply to everything except certain ports:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-except-health
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
  - from:
    - source:
        namespaces:
        - "untrusted"
    to:
    - operation:
        notPorts:
        - "8081"
```

This denies traffic from the `untrusted` namespace on all ports except 8081. The `notPorts` field inverts the port matching.

## TCP Services and Port Authorization

For TCP services like databases, port-based authorization is especially important because you cannot match on HTTP paths or methods. The port is one of the few attributes you can use:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: postgres-port-access
  namespace: database
spec:
  selector:
    matchLabels:
      app: postgres
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/api-server"
    to:
    - operation:
        ports:
        - "5432"
```

Only the API server can connect to PostgreSQL on port 5432. No other service, no other port.

## Protecting Admin and Debug Ports

Many applications expose admin or debug ports that should never be accessible from outside the local namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: lock-down-debug-port
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
  - from:
    - source:
        notNamespaces:
        - "default"
    to:
    - operation:
        ports:
        - "6060"
        - "9999"
```

This denies any external namespace from reaching the debug ports (6060 and 9999). Only services in the same namespace can access them.

## Port Ranges

Istio does not support port ranges in authorization policies (like `8080-8090`). You need to list each port individually:

```yaml
to:
- operation:
    ports:
    - "8080"
    - "8081"
    - "8082"
```

If you have a lot of ports, this can get verbose, but it keeps the policies explicit and easy to audit.

## Real-World Example: Sidecar Pattern with Multiple Ports

Consider a pod running a main application container and a sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:latest
        ports:
        - containerPort: 8080
          name: http
        - containerPort: 8081
          name: health
      - name: cache-proxy
        image: redis-proxy:latest
        ports:
        - containerPort: 6379
          name: tcp-redis
```

You want different access rules for the app ports and the cache proxy port:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: my-app-ports
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: ALLOW
  rules:
  # App API port - allow from gateway
  - from:
    - source:
        principals:
        - "cluster.local/ns/gateway/sa/ingress"
    to:
    - operation:
        ports:
        - "8080"
        methods:
        - "GET"
        - "POST"
  # Health port - allow from monitoring
  - from:
    - source:
        principals:
        - "cluster.local/ns/monitoring/sa/health-checker"
    to:
    - operation:
        ports:
        - "8081"
        methods:
        - "GET"
  # Redis proxy port - only local namespace
  - from:
    - source:
        namespaces:
        - "default"
    to:
    - operation:
        ports:
        - "6379"
```

## Port Matching and Protocol Detection

Istio uses port names to determine the protocol. Ports named `http-*`, `grpc-*`, or `https-*` are treated as HTTP traffic. Ports named `tcp-*` are treated as TCP. Unnamed ports default to TCP.

This matters because HTTP-specific fields (like `methods` and `paths`) only work on ports that Istio recognizes as HTTP. If you try to match on `methods` for a TCP port, those fields will be ignored and the rule will match based on the remaining non-HTTP fields only.

```yaml
# This will NOT work as expected for a TCP port
- to:
  - operation:
      ports:
      - "5432"  # TCP port
      methods:
      - "GET"   # Ignored for TCP traffic
```

For TCP ports, stick to port, principal, namespace, and IP-based matching.

## Verifying Port-Specific Policies

Test each port independently:

```bash
# Test API port (should succeed from allowed source)
kubectl exec -n gateway deploy/ingress -- curl -s -w "%{http_code}" http://my-app.default:8080/api/test

# Test metrics port from monitoring (should succeed)
kubectl exec -n monitoring deploy/prometheus -- curl -s -w "%{http_code}" http://my-app.default:9090/metrics

# Test API port from unauthorized source (should get 403)
kubectl exec -n monitoring deploy/prometheus -- curl -s -w "%{http_code}" http://my-app.default:8080/api/test
```

Inspect the loaded policy configuration:

```bash
istioctl x authz check <pod-name> -n default
```

## Summary

Port-specific authorization policies let you apply different access rules to different ports on the same workload. This is essential for multi-port services where the main application port, metrics port, health check port, and debug port all need different access controls. Always remember that HTTP-specific matching only works on ports that Istio detects as HTTP, and list ports explicitly since ranges are not supported.
