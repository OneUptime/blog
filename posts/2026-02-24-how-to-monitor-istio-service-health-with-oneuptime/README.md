# How to Monitor Istio Service Health with OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Monitoring, Health Checks, Service Mesh

Description: Set up comprehensive service health monitoring for Istio-managed services using OneUptime probes, metrics, and status tracking.

---

Running services inside an Istio mesh gives you automatic mTLS, traffic management, and observability. But you still need to actively monitor whether your services are healthy. OneUptime can monitor Istio services from multiple angles: external probes, internal metrics, and mesh-level health signals. Here's how to set up each layer.

## Understanding Service Health in Istio

Service health in an Istio mesh has several dimensions:

1. **Pod health**: Are the application containers and sidecar proxies running?
2. **Connectivity**: Can services reach each other through the mesh?
3. **Performance**: Are latency and error rates within acceptable bounds?
4. **Control plane health**: Is istiod functioning correctly?
5. **Certificate health**: Are mTLS certificates valid and rotating properly?

A comprehensive monitoring setup checks all of these.

## Layer 1: External HTTP Monitoring

If your services are exposed through an Istio Ingress Gateway, set up OneUptime HTTP monitors to check them from outside the cluster.

First, make sure your service is properly exposed:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: app-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: app-tls-cert
    hosts:
    - "app.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: app-vs
  namespace: default
spec:
  hosts:
  - "app.example.com"
  gateways:
  - app-gateway
  http:
  - match:
    - uri:
        prefix: /
    route:
    - destination:
        host: app-service
        port:
          number: 8080
```

In OneUptime, create an HTTP monitor:

- **URL**: `https://app.example.com/health`
- **Method**: GET
- **Expected Status Code**: 200
- **Check Interval**: 1 minute
- **Timeout**: 10 seconds
- **Monitoring Locations**: Select multiple geographic regions

This catches issues like gateway misconfiguration, TLS certificate problems, and complete service outages.

## Layer 2: Kubernetes Health Integration

OneUptime can monitor Kubernetes resources directly. Set up a connection to your cluster and track pod health for critical services:

```bash
# First, make sure your services have proper health checks defined
# This is important because Istio modifies health check behavior
```

When running in an Istio mesh, health probes need special handling because the sidecar intercepts traffic. Istio automatically rewrites health check probes to work with the sidecar. Make sure your pods have both liveness and readiness probes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    spec:
      containers:
      - name: my-service
        image: my-service:latest
        ports:
        - containerPort: 8080
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Layer 3: Metrics-Based Health Monitoring

This is where Istio really shines. With the metrics pipeline configured (as described in the metrics post), you can set up OneUptime to monitor service health based on actual traffic patterns.

The key metrics to monitor are:

### Request Success Rate

Track the ratio of successful requests to total requests:

```
# Success rate calculation using istio_requests_total
sum(rate(istio_requests_total{response_code!~"5.*", destination_service="my-service.default.svc.cluster.local"}[5m]))
/
sum(rate(istio_requests_total{destination_service="my-service.default.svc.cluster.local"}[5m]))
```

In OneUptime, create a metric monitor that alerts when the success rate drops below your threshold (e.g., 99.9%).

### Latency Percentiles

Monitor the p99 latency for your services:

```
# P99 latency for a specific service
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service="my-service.default.svc.cluster.local"}[5m])) by (le)
)
```

Set alerts for when p99 latency exceeds your SLO target.

### Connection Errors

Track TCP connection failures:

```
# Rate of connection failures
sum(rate(istio_tcp_connections_closed_total{connection_security_policy="mutual_tls", destination_service="my-service.default.svc.cluster.local"}[5m]))
```

## Layer 4: Control Plane Health

The Istio control plane (istiod) is critical. If it goes down, new configurations won't be pushed and certificate rotation will stop. Monitor these istiod metrics:

```yaml
# Key istiod health metrics to track:

# Configuration push errors
# pilot_xds_push_errors should be 0 or very low
# pilot_total_xds_rejects should be 0

# Control plane resource usage
# container_memory_working_set_bytes{container="discovery", namespace="istio-system"}
# container_cpu_usage_seconds_total{container="discovery", namespace="istio-system"}

# Certificate expiration
# citadel_server_root_cert_expiry_timestamp
# This should always be far in the future
```

Set up monitoring for the istiod deployment itself:

```bash
# Check istiod status
kubectl get pods -n istio-system -l app=istiod

# Verify the control plane is healthy
istioctl proxy-status

# Any proxy showing as "STALE" indicates a control plane issue
```

## Layer 5: Synthetic Transaction Monitoring

For critical paths, set up synthetic monitors that simulate real user journeys through your mesh. This catches issues that simple health checks might miss.

Create a dedicated test namespace with a synthetic traffic generator:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: synthetic-monitor
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: synthetic-monitor
  template:
    metadata:
      labels:
        app: synthetic-monitor
    spec:
      containers:
      - name: monitor
        image: curlimages/curl:latest
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            # Test the full request path through the mesh
            RESULT=$(curl -s -o /dev/null -w "%{http_code}" http://frontend.default.svc.cluster.local:8080/api/products)
            if [ "$RESULT" != "200" ]; then
              echo "UNHEALTHY: frontend returned $RESULT"
            else
              echo "HEALTHY: frontend returned 200"
            fi
            sleep 30
          done
```

## Setting Up Health Dashboards in OneUptime

Create a OneUptime dashboard that shows all health dimensions at a glance:

**Service Health Overview Panel**:
- Row 1: External probe status (green/red) for each exposed service
- Row 2: Success rate gauge for each service (target: >99.9%)
- Row 3: P99 latency for each service
- Row 4: Control plane status

**Alert Configuration**:

| Condition | Severity | Notification |
|---|---|---|
| External probe fails 3 consecutive checks | Critical | Page on-call |
| Success rate < 99.5% for 5 minutes | High | Slack + Email |
| P99 latency > 2x baseline for 10 minutes | Medium | Slack |
| istiod pod not ready | Critical | Page on-call |
| Certificate expiry < 7 days | High | Email |

## Handling Mesh-Specific Health Issues

Some health issues are unique to service mesh environments:

**Sidecar injection failures**: If the sidecar isn't injected, the pod runs outside the mesh. Monitor for pods in injected namespaces that are missing the `istio-proxy` container:

```bash
# Find pods without sidecars in labeled namespaces
kubectl get pods -A -o json | jq -r '
  .items[] |
  select(.metadata.labels["istio.io/rev"] != null or
         .metadata.namespace as $ns |
         ["default"] | index($ns) != null) |
  select([.spec.containers[].name] | index("istio-proxy") == null) |
  "\(.metadata.namespace)/\(.metadata.name)"
'
```

**mTLS failures**: If mTLS is misconfigured, services can't communicate. Watch for spikes in connection errors and 503 responses with the `UC` (upstream connection failure) response flag.

**Configuration drift**: After applying new Istio configuration, verify it was accepted:

```bash
# Check for configuration issues
istioctl analyze -n default

# Verify proxy received the latest config
istioctl proxy-status
```

With all these monitoring layers in OneUptime, you'll catch problems before your users do. The combination of external probes, mesh metrics, and control plane monitoring gives you full coverage of your Istio service health.
