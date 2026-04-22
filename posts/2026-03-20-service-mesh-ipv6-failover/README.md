# How to Configure IPv6 Failover in Service Meshes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Mesh, IPv6, Failover, High Availability, Istio, Multi-Cluster

Description: A guide to configuring automatic failover for IPv6 services in service meshes, covering locality-based load balancing, health-based failover, and multi-cluster IPv6 failover strategies.

Service mesh failover ensures traffic is redirected when endpoints become unhealthy. For IPv6 services in dual-stack clusters, failover must handle both IPv4 and IPv6 endpoints correctly. This guide covers configuring reliable failover for IPv6-enabled services.

## Understanding Endpoint Failover with IPv6

In a dual-stack cluster, a service may have both IPv4 and IPv6 endpoints. Kubernetes represents these with EndpointSlices, with separate slices for IPv4 and IPv6. Kubernetes readiness changes remove the pod's addresses from load balancing for both IP families, while Envoy outlier detection ejects the failing upstream host/IP:port.

```bash
# Check current endpoints for a service (both IPv4 and IPv6)

kubectl get endpointslice -l kubernetes.io/service-name=my-service -o yaml

# In dual-stack, there are separate EndpointSlices per IP family:
# addressType: IPv4
# endpoints:
# - addresses:
#   - 10.0.0.5
#
# addressType: IPv6
# endpoints:
# - addresses:
#   - fd00::5

# Verify Envoy sees both in its cluster
istioctl proxy-config endpoints <pod-name> | grep my-service
```

## Health-Based Failover with Istio Outlier Detection

```yaml
# DestinationRule with aggressive outlier detection for fast failover
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-failover
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      # Eject endpoint after 3 consecutive 5xx errors
      consecutive5xxErrors: 3
      # Check every 10 seconds
      interval: 10s
      # Keep ejected for 30 seconds minimum
      baseEjectionTime: 30s
      # Eject up to 80% of endpoints
      maxEjectionPercent: 80
      # Also detect connection failures (important for IPv6 connectivity issues)
      splitExternalLocalOriginErrors: true
      consecutiveLocalOriginFailures: 3
    connectionPool:
      tcp:
        connectTimeout: 3s    # Fast timeout to detect IPv6 connectivity issues
```

## Locality-Based Load Balancing and Failover

```yaml
# DestinationRule with locality failover (region-level; zone failover is automatic)
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service-locality
  namespace: default
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
        failover:
          # If us-east-1 is unhealthy, fail over to us-west-2
          - from: us-east-1
            to: us-west-2
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
```

## Multi-Cluster IPv6 Failover

For multi-cluster service mesh with IPv6:

```yaml
# ServiceEntry for remote cluster service (IPv6 endpoints)
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: my-service-remote
  namespace: default
spec:
  hosts:
    - my-service-remote.default.svc.cluster.local
  addresses:
    - 2001:db8:ffff::2/128  # Unique IPv6 VIP for routing
  ports:
    - number: 80
      name: http
      protocol: HTTP
  location: MESH_INTERNAL
  resolution: STATIC
  endpoints:
    # IPv6 endpoints in remote cluster
    - address: "2001:db8:10::10"
      ports:
        http: 80
      locality: us-west-2/us-west-2a
      labels:
        version: v1
    - address: "2001:db8:10::11"
      ports:
        http: 80
      locality: us-west-2/us-west-2b
      labels:
        version: v1
```

## VirtualService with Retry-Based Failover

```yaml
# Automatic retry with failover to another endpoint or locality
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service-retry-failover
  namespace: default
spec:
  hosts:
    - my-service.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: my-service.default.svc.cluster.local
          weight: 100
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
        # Retry on connection failures (catches IPv6 connectivity issues)
        retryOn: "gateway-error,connect-failure,refused-stream,5xx"
        retryRemoteLocalities: true  # Try different locality on retry
```

## Linkerd Retry-Based Failover with HTTPRoute

```yaml
# Linkerd HTTPRoute with retries across weighted backends
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-service-failover-route
  namespace: default
  annotations:
    retry.linkerd.io/http: "5xx,gateway-error"
    retry.linkerd.io/limit: "2"
    retry.linkerd.io/timeout: "300ms"
spec:
  parentRefs:
    - name: my-service
      kind: Service
      group: core
      port: 80
  rules:
    - backendRefs:
        - name: my-service-v1
          port: 80
          weight: 100
        - name: my-service-backup
          port: 80
          weight: 1      # Weight 0 receives no traffic; use a small non-zero fallback weight
```

## Testing IPv6 Failover

```bash
# Simulate a pod endpoint failure
kubectl delete pod <my-service-pod-name>

# Watch EndpointSlices update
kubectl get endpointslice -l kubernetes.io/service-name=my-service -w

# Verify outlier detection is configured for the cluster
istioctl proxy-config clusters <calling-pod-name> \
  --fqdn my-service.default.svc.cluster.local -o json | \
  python3 -m json.tool | grep -A 10 "outlierDetection"

# If you simulate failures while the endpoint remains registered,
# check Envoy's outlier detection stats via admin API
kubectl exec <calling-pod-name> -c istio-proxy -- \
  curl -s http://localhost:15000/stats | \
  grep "outlier_detection.*ejections"

# Test that IPv6 traffic fails over automatically
# Run continuous requests from an IPv6 client
kubectl exec test-pod -- bash -c \
  "while true; do curl -6 -s -o /dev/null -w '%{http_code}\n' http://my-service/; sleep 1; done"
# Should show 200s even during pod failures
```

## Monitoring Failover Events

```promql
# Prometheus: track outlier detection ejections
sum(
  rate(envoy_cluster_outlier_detection_ejections_enforced_total[5m])
) by (cluster_name)

# Track failover-related errors
sum(
  rate(istio_requests_total{response_code="503",reporter="source"}[5m])
) by (destination_service_name)

# Check ejection ratio
sum(envoy_cluster_outlier_detection_ejections_active) by (cluster_name)
/
sum(envoy_cluster_membership_total) by (cluster_name)
```

Service mesh failover for IPv6 services works through the same outlier detection and locality-based load balancing mechanisms as IPv4. The critical configuration is setting `consecutive5xxErrors` for upstream 5xx responses, `consecutiveLocalOriginFailures` for local connection failures, and short `connectTimeout` values so IPv6 connectivity failures are detected quickly and traffic fails over without extended client-visible errors.
