# How to Configure Port-Level mTLS in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, MTLS, Port Configuration, PeerAuthentication, Security

Description: Detailed guide to configuring different mutual TLS modes on different ports of the same service in Istio using PeerAuthentication.

---

Services often expose multiple ports for different purposes. Your main application might listen on port 8080, metrics on port 9090, health checks on port 8081, and a debug endpoint on port 6060. Not all of these ports need the same security treatment. Istio's PeerAuthentication lets you set different mTLS modes for each port independently.

This is essential for running strict mTLS on production traffic while keeping monitoring and debugging ports accessible to tools that do not support mTLS.

## The portLevelMtls Field

PeerAuthentication has a `portLevelMtls` field that maps port numbers to mTLS settings. Ports not listed inherit the top-level `mtls.mode`.

Basic structure:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT           # Default for all ports
  portLevelMtls:
    9090:
      mode: PERMISSIVE     # Override for port 9090
    8081:
      mode: DISABLE        # Override for port 8081
```

In this configuration:
- Port 8080 (and any other unlisted port) uses STRICT mode
- Port 9090 uses PERMISSIVE mode
- Port 8081 has mTLS completely disabled

## Real-World Configuration

Here is a typical multi-port service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api-server
        image: myregistry/api-server:latest
        ports:
        - containerPort: 8080
          name: http-api
        - containerPort: 9090
          name: http-metrics
        - containerPort: 8081
          name: http-health
        - containerPort: 6060
          name: http-debug
---
apiVersion: v1
kind: Service
metadata:
  name: api-server
  namespace: production
spec:
  selector:
    app: api-server
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
  - name: http-metrics
    port: 9090
    targetPort: 9090
  - name: http-health
    port: 8081
    targetPort: 8081
  - name: http-debug
    port: 6060
    targetPort: 6060
```

And the port-level mTLS policy:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: api-server-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-server
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE    # Prometheus can scrape without mTLS
    8081:
      mode: PERMISSIVE    # External health checkers can connect
    6060:
      mode: DISABLE       # Debug endpoint, no TLS at all
```

## Port Numbers: Container Port vs Service Port

A critical detail that trips people up: the port numbers in `portLevelMtls` refer to the **target port** (container port), not the Service port. If your Service maps port 80 to targetPort 8080, you use 8080 in the PeerAuthentication.

```yaml
# Service definition
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http
    port: 80             # Service port (external)
    targetPort: 8080      # Container port (used in portLevelMtls)
  - name: metrics
    port: 9090
    targetPort: 9090

# PeerAuthentication
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: my-service-mtls
spec:
  selector:
    matchLabels:
      app: my-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8080:               # Use container port, not service port 80
      mode: STRICT
    9090:
      mode: PERMISSIVE
```

## Namespace-Wide Port-Level Policies

You can apply port-level mTLS settings at the namespace level (without a selector). This applies to all pods in the namespace:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE
```

Every pod in the production namespace now accepts plain text on port 9090 while requiring mTLS on all other ports. This is convenient when all services follow the same port convention for metrics.

## Combining Namespace and Workload Policies

When both exist, the workload-specific policy takes full priority. It does NOT merge with the namespace policy:

```yaml
# Namespace policy
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    9090:
      mode: PERMISSIVE

---
# Workload policy - completely overrides the namespace policy for matching pods
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: special-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: special-service
  mtls:
    mode: PERMISSIVE
```

The special-service pods use PERMISSIVE on all ports. They do NOT inherit the port 9090 exception from the namespace policy. The workload policy replaces the namespace policy entirely, it does not merge with it.

If you want the special service to also have the port 9090 exception, include it explicitly:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: special-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: special-service
  mtls:
    mode: PERMISSIVE
  portLevelMtls:
    9090:
      mode: PERMISSIVE
```

## Pattern: Strict with Prometheus Exception

The most common port-level pattern is strict mTLS with a Prometheus metrics exception:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT
  portLevelMtls:
    15020:
      mode: PERMISSIVE    # Istio agent health
    9090:
      mode: PERMISSIVE    # Application metrics
```

## Pattern: gRPC Service with HTTP Health Check

gRPC services sometimes expose an HTTP health check on a separate port:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: grpc-service-mtls
  namespace: production
spec:
  selector:
    matchLabels:
      app: grpc-service
  mtls:
    mode: STRICT
  portLevelMtls:
    8081:
      mode: PERMISSIVE    # HTTP health endpoint for load balancer
```

## Verifying Port-Level Configuration

Check the effective configuration:

```bash
istioctl proxy-config listener <pod-name> -n production
```

This lists all listeners and their configurations. Look for the specific ports and check if they have TLS settings.

For a specific port:

```bash
istioctl proxy-config listener <pod-name> -n production --port 9090 -o json
```

Look for the `transportSocket` field in the filter chain. If mTLS is enabled, you will see TLS configuration. If it is disabled or permissive, the configuration will differ.

## Testing Each Port

Test each port individually to confirm the policy is correct:

```bash
# From a sidecar-injected pod (should work on all ports)
kubectl exec deploy/test-client -c test-client -- curl -s http://api-server:8080/api
kubectl exec deploy/test-client -c test-client -- curl -s http://api-server:9090/metrics
kubectl exec deploy/test-client -c test-client -- curl -s http://api-server:8081/health

# From a pod without a sidecar
kubectl run test --image=curlimages/curl --labels="sidecar.istio.io/inject=false" --restart=Never -it --rm -- sh

# Inside the test pod:
# This should FAIL (STRICT)
curl -s http://api-server.production:8080/api

# This should SUCCEED (PERMISSIVE)
curl -s http://api-server.production:9090/metrics

# This should SUCCEED (PERMISSIVE)
curl -s http://api-server.production:8081/health

# This should SUCCEED (DISABLE)
curl -s http://api-server.production:6060/debug
```

## Monitoring Port-Level mTLS

Prometheus metrics include the destination port, so you can track mTLS adoption per port:

```text
sum(rate(istio_requests_total{destination_service="api-server.production.svc.cluster.local", reporter="destination"}[5m])) by (destination_port, connection_security_policy)
```

This shows you the traffic breakdown per port and whether it uses mTLS or not. Use this to validate that your port-level policies match your expectations.

Port-level mTLS gives you the precision to lock down your main application traffic while keeping auxiliary ports accessible. Use it to avoid the all-or-nothing choice between strict mTLS and permissive mode.
