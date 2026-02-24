# How to Set Up Istio for Sidecar Pattern (Beyond Envoy)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar Pattern, Service Mesh, Kubernetes, Architecture

Description: Go beyond the default Envoy sidecar in Istio by deploying custom sidecar containers for logging, authentication, caching, and other cross-cutting concerns.

---

When people hear "sidecar pattern in Istio," they immediately think of the Envoy proxy sidecar that Istio injects into every pod. But the sidecar pattern is much broader than that. A sidecar is any container that runs alongside your application container in the same pod, sharing the network namespace and optionally sharing volumes. You can use sidecars for logging agents, authentication proxies, config watchers, cache layers, data transformation, and many other cross-cutting concerns.

Istio already uses the sidecar pattern with Envoy, but you can layer additional sidecars on top. These custom sidecars work alongside Envoy and benefit from the mesh features (mTLS, telemetry, traffic management) while adding their own functionality.

## Why Additional Sidecars

The Envoy sidecar handles networking concerns: traffic routing, load balancing, security, observability. But there are responsibilities that do not fit naturally into a proxy:

- **Log shipping**: Forward application logs to a central system
- **Config watching**: Watch a config store and reload the app when configs change
- **Credential rotation**: Fetch and rotate credentials from a secrets manager
- **Local caching**: Run a local cache that the app accesses via localhost
- **Data transformation**: Transform request/response payloads for legacy compatibility
- **Health aggregation**: Combine health checks from multiple sources

## Basic Sidecar Setup in Istio

Adding a custom sidecar to an Istio-injected pod is straightforward. You add extra containers to your pod spec alongside the application container. Istio's injection adds the Envoy container automatically:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
      # Application container
      - name: my-service
        image: my-registry/my-service:latest
        ports:
        - containerPort: 8080
        volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app
        - name: shared-data
          mountPath: /data
      # Custom sidecar: log shipper
      - name: log-shipper
        image: fluent/fluent-bit:latest
        volumeMounts:
        - name: shared-logs
          mountPath: /var/log/app
          readOnly: true
        - name: fluent-config
          mountPath: /fluent-bit/etc
      # Custom sidecar: config watcher
      - name: config-watcher
        image: my-registry/config-watcher:latest
        volumeMounts:
        - name: shared-data
          mountPath: /data
        env:
        - name: CONFIG_SOURCE
          value: "http://config-service/api/config/my-service"
        - name: RELOAD_SIGNAL
          value: "SIGHUP"
      # Istio injects the envoy sidecar automatically
      volumes:
      - name: shared-logs
        emptyDir: {}
      - name: shared-data
        emptyDir: {}
      - name: fluent-config
        configMap:
          name: fluent-bit-config
```

After Istio injection, this pod has four containers: the app, the log shipper, the config watcher, and Envoy.

## Sidecar for Local Caching

Running a local Redis or Memcached sidecar gives your app a zero-latency cache:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: api-service
        image: my-registry/api-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: CACHE_HOST
          value: "localhost"
        - name: CACHE_PORT
          value: "6379"
      - name: local-cache
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            cpu: "50m"
            memory: "64Mi"
          limits:
            cpu: "100m"
            memory: "128Mi"
        command: ["redis-server", "--maxmemory", "100mb", "--maxmemory-policy", "allkeys-lru"]
```

The app connects to Redis on localhost:6379. The traffic stays within the pod, so it does not go through Envoy. This is by design - pod-internal traffic on localhost bypasses the sidecar proxy.

## Configuring Istio to Exclude Sidecar Ports

If your custom sidecar listens on a port that should not be intercepted by Envoy, exclude it:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "6379,9090"
        traffic.sidecar.istio.io/excludeOutboundPorts: "6379"
    spec:
      containers:
      - name: my-service
        image: my-registry/my-service:latest
        ports:
        - containerPort: 8080
      - name: local-cache
        image: redis:7-alpine
        ports:
        - containerPort: 6379
      - name: metrics-collector
        image: my-registry/metrics-collector:latest
        ports:
        - containerPort: 9090
```

The `excludeInboundPorts` annotation tells Envoy not to intercept traffic arriving on ports 6379 and 9090. The `excludeOutboundPorts` tells Envoy not to capture outbound traffic to port 6379.

## Sidecar for Authentication and Token Management

A common pattern is an authentication sidecar that handles OAuth token refresh and injects authentication headers:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: external-api-client
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: app
        image: my-registry/api-client:latest
        ports:
        - containerPort: 8080
        env:
        - name: AUTH_PROXY
          value: "http://localhost:8081"
      - name: auth-sidecar
        image: my-registry/auth-proxy:latest
        ports:
        - containerPort: 8081
        env:
        - name: OAUTH_TOKEN_URL
          value: "https://auth.provider.com/oauth/token"
        - name: CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: oauth-credentials
              key: client-id
        - name: CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: oauth-credentials
              key: client-secret
        volumeMounts:
        - name: token-cache
          mountPath: /var/cache/tokens
      volumes:
      - name: token-cache
        emptyDir: {}
```

The app sends requests to the auth sidecar on localhost:8081. The sidecar adds the OAuth token and forwards the request to the actual destination. The sidecar handles token refresh automatically.

## Sidecar Resource Management

Multiple sidecars increase the resource footprint of each pod. Plan resources carefully:

```yaml
      containers:
      - name: my-service
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
      - name: log-shipper
        resources:
          requests:
            cpu: "50m"
            memory: "32Mi"
          limits:
            cpu: "100m"
            memory: "64Mi"
      - name: config-watcher
        resources:
          requests:
            cpu: "25m"
            memory: "16Mi"
          limits:
            cpu: "50m"
            memory: "32Mi"
```

Add up all container resources when sizing your nodes. A pod with the app (200m CPU), Envoy sidecar (~100m CPU), log shipper (50m CPU), and config watcher (25m CPU) requests 375m CPU total.

## Sidecar Lifecycle Management

Kubernetes does not guarantee the startup order of containers within a pod. If your app depends on a sidecar being ready first (like the cache needing to be up before the app starts), use container startup probes or init containers:

```yaml
      initContainers:
      - name: wait-for-cache
        image: busybox:latest
        command: ['sh', '-c', 'until nc -z localhost 6379; do sleep 1; done']
      containers:
      - name: my-service
        image: my-registry/my-service:latest
      - name: local-cache
        image: redis:7-alpine
        startupProbe:
          tcpSocket:
            port: 6379
          failureThreshold: 10
          periodSeconds: 1
```

For Istio specifically, there is a known issue where the app container might start before the Envoy sidecar is ready. You can use the `holdApplicationUntilProxyStarts` annotation:

```yaml
    metadata:
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

This makes Kubernetes wait for the Envoy sidecar to be ready before starting the application container.

## Using the Istio Sidecar Resource to Limit Scope

The Istio `Sidecar` resource (not to be confused with sidecar containers) controls the Envoy proxy's behavior. Use it to limit what services the proxy can see, reducing memory usage:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: my-service
  namespace: production
spec:
  workloadSelector:
    labels:
      app: my-service
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "production/product-service.production.svc.cluster.local"
    - "production/pricing-service.production.svc.cluster.local"
```

This limits the Envoy proxy to only know about services in the current namespace, the istio-system namespace, and the specific services this app calls. Reduces memory footprint and configuration push time.

## Monitoring All Sidecars

Track resource usage across all containers in your pods:

```bash
# CPU and memory for all containers in a pod
kubectl top pods -n production --containers
```

Set up Prometheus alerts for sidecar resource usage:

```yaml
groups:
- name: sidecar-alerts
  rules:
  - alert: SidecarHighMemory
    expr: container_memory_working_set_bytes{container="log-shipper"} > 100e6
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Log shipper sidecar using more than 100MB memory"
```

## Summary

The sidecar pattern extends beyond Envoy in Istio. Add custom sidecar containers for logging, caching, authentication, config watching, and other cross-cutting concerns. Use shared volumes for communication between containers. Exclude custom sidecar ports from Envoy interception when the traffic should stay pod-internal. Manage resources carefully since each sidecar adds to the pod's footprint. Use init containers or startup probes to control startup order. The Istio Sidecar resource (the CRD, not the container) helps limit the Envoy proxy's scope to reduce memory usage. Combining Envoy with custom sidecars gives you a powerful per-pod infrastructure layer.
