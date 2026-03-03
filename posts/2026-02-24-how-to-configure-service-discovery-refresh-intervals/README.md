# How to Configure Service Discovery Refresh Intervals

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, Configuration, Kubernetes, Performance

Description: Tune Istio service discovery refresh intervals to balance between configuration freshness and control plane performance in your mesh.

---

When services come and go in your mesh, how quickly do other services learn about the changes? That depends on several refresh intervals throughout Istio's service discovery pipeline. Tuning these intervals lets you trade off between how fast new services become reachable and how much load you put on the control plane. Most of the time the defaults work fine, but large meshes or latency-sensitive applications sometimes need adjustments.

## The Refresh Pipeline

Service discovery updates flow through several stages, each with its own timing:

1. **Kubernetes API watch**: Istiod watches the Kubernetes API for changes to Services, Endpoints, and Istio custom resources. This is event-driven and near-instantaneous.

2. **Istiod processing**: When istiod receives a change event, it debounces multiple changes and batches them into a single configuration push. This introduces a configurable delay.

3. **xDS push to proxies**: Istiod pushes the updated configuration to affected sidecar proxies. The push time depends on the number of proxies and the size of the configuration.

4. **DNS resolution**: For ServiceEntry resources with `resolution: DNS`, the DNS TTL determines how often IP addresses are re-resolved.

## Tuning the Debounce Interval

Istiod doesn't push configuration on every single change event. If you scale a deployment from 1 to 10 replicas, that's 10 endpoint changes in rapid succession. Instead of sending 10 separate pushes, istiod waits for a debounce period and sends one combined push.

The default debounce values are:

- `PILOT_DEBOUNCE_AFTER`: 100ms (wait at least this long after the first change)
- `PILOT_DEBOUNCE_MAX`: 10s (push at most this long after the first change)

To adjust these:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        PILOT_DEBOUNCE_AFTER: "100"
        PILOT_DEBOUNCE_MAX: "10000"
```

For faster discovery (at the cost of more frequent pushes):

```yaml
env:
  PILOT_DEBOUNCE_AFTER: "50"
  PILOT_DEBOUNCE_MAX: "3000"
```

For lower control plane load (at the cost of slower discovery):

```yaml
env:
  PILOT_DEBOUNCE_AFTER: "500"
  PILOT_DEBOUNCE_MAX: "30000"
```

## Monitoring Push Frequency

Check how often istiod is pushing configuration:

```text
sum(rate(pilot_xds_pushes[5m])) by (type)
```

If you're seeing hundreds of pushes per second, the debounce interval might be too short or you have a lot of configuration churn.

Check the push latency:

```text
histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket[5m])) by (le))
```

If push latency is high (above 10 seconds), you might need to optimize your configuration or scale istiod.

## DNS Refresh for External Services

ServiceEntry resources with `resolution: DNS` rely on DNS TTL for refresh intervals. Istio respects the TTL returned by the DNS server. When the TTL expires, Istio re-resolves the hostname.

You can't directly control the DNS TTL from Istio (it comes from the DNS server), but you can influence it:

If your CoreDNS is configured with caching:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }
        forward . /etc/resolv.conf {
            max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
```

The `cache 30` line means CoreDNS caches DNS responses for 30 seconds. Lowering this value means more frequent DNS lookups but faster discovery of IP changes.

For critical external services where you need fast failover, consider using `resolution: STATIC` with explicit endpoints that you update through your deployment pipeline:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: critical-api
  namespace: backend
spec:
  hosts:
  - "api.critical-service.com"
  location: MESH_EXTERNAL
  ports:
  - number: 443
    name: https
    protocol: TLS
  resolution: STATIC
  endpoints:
  - address: 203.0.113.10
  - address: 203.0.113.11
```

## Endpoint Discovery Refresh

Kubernetes endpoints are event-driven, so there's no polling interval. When a pod becomes ready or gets terminated, the endpoints controller immediately updates the Endpoints resource, and istiod picks up the change through its Kubernetes API watch.

However, you can influence how quickly pods are considered ready (and thus added to the endpoint list):

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
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 2
          periodSeconds: 5
          failureThreshold: 2
```

A `periodSeconds: 5` means the kubelet checks readiness every 5 seconds. Lowering this value means the pod is added to endpoints faster after it starts, but it also increases load on the kubelet.

## Health Check Intervals

Istio can perform its own health checks through outlier detection. These checks run at the proxy level and control how quickly unhealthy endpoints are removed from the load balancing pool:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: backend
spec:
  host: my-service.backend.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

- `interval: 10s`: Check for outliers every 10 seconds
- `consecutive5xxErrors: 3`: Eject an endpoint after 3 consecutive 5xx errors
- `baseEjectionTime: 30s`: Keep the endpoint ejected for at least 30 seconds
- `maxEjectionPercent: 50`: Never eject more than 50% of endpoints

For faster failure detection:

```yaml
outlierDetection:
  consecutive5xxErrors: 1
  interval: 5s
  baseEjectionTime: 15s
```

This detects failures faster but is more sensitive to transient errors. A single 500 response will eject the endpoint for 15 seconds.

## xDS Connection and Refresh Settings

The sidecar proxy maintains a persistent gRPC connection to istiod for receiving configuration updates. If this connection drops, the proxy uses its last known configuration. When the connection is re-established, istiod sends the full configuration.

Control the reconnection behavior with proxy configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: ProxyConfig
metadata:
  name: default
  namespace: istio-system
spec:
  environmentVariables:
    ISTIO_META_DNS_CAPTURE: "true"
```

The default reconnection behavior uses exponential backoff starting at 1 second. For most environments, the defaults work well.

## Scaling Considerations

In large meshes (thousands of services, tens of thousands of pods), refresh intervals have a bigger impact:

**Too-frequent pushes**: Each push triggers config processing in every affected proxy. With 10,000 proxies and a push every 100ms, you're generating enormous network traffic and CPU usage.

**Too-infrequent pushes**: New service instances take too long to receive traffic, and terminated instances keep receiving traffic after they're gone.

Monitor the relationship between push frequency and proxy CPU:

```text
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (namespace)
```

If proxy CPU usage spikes during deployments, your debounce interval might be too short, causing many rapid pushes.

## Practical Recommendations

For most clusters (under 500 services):
- Keep the default debounce settings (100ms/10s)
- Use default CoreDNS cache TTL (30s)
- Set outlier detection interval to 10s

For large clusters (500+ services):
- Increase debounce: 200ms/15s
- Use Sidecar resources to reduce configuration scope per proxy
- Consider running multiple istiod replicas

For latency-sensitive applications:
- Lower debounce: 50ms/5s
- Lower outlier detection interval: 5s
- Lower CoreDNS cache TTL: 10s

Finding the right balance depends on your specific workload and tolerance for stale configuration. Start with the defaults, monitor the metrics, and adjust when you have data showing that the defaults aren't working for your situation.
