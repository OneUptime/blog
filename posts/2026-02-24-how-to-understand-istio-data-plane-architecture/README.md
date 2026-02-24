# How to Understand Istio Data Plane Architecture

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Envoy, Sidecar Proxy, Kubernetes

Description: An in-depth look at how Istio's data plane works, including the Envoy sidecar proxy, traffic interception, and the request lifecycle through the mesh.

---

The data plane is where all the actual work happens in Istio. While the control plane (istiod) manages configuration and certificates, the data plane handles every single network request that flows through your mesh. Understanding how it works will help you debug networking issues, optimize performance, and make better decisions about your mesh configuration.

## What Is the Data Plane?

The data plane in Istio is the collection of all Envoy proxy instances running as sidecars alongside your application containers. Every pod in the mesh has two containers: your application and an Envoy proxy. All inbound and outbound traffic for your application passes through this proxy.

You can see the sidecar in any pod:

```bash
kubectl get pod my-app-xyz -o jsonpath='{.spec.containers[*].name}'
# my-app istio-proxy
```

The `istio-proxy` container is the Envoy sidecar. It runs the same Envoy binary that is used in many other projects, but with Istio-specific configuration and extensions.

## The Request Lifecycle

When service A makes an HTTP request to service B, here is exactly what happens:

### Step 1: Application Sends Request

Your application code makes a normal HTTP request. It does not know anything about Istio or Envoy. For example, it calls `http://service-b:8080/api/data`.

### Step 2: iptables Redirect

An init container (istio-init) set up iptables rules when the pod started. These rules redirect all outbound traffic from your application to the Envoy sidecar listening on port 15001.

```bash
# You can see the iptables rules inside a pod
kubectl exec my-app-xyz -c istio-proxy -- iptables -t nat -L -n -v
```

The key rules are:
- All outbound TCP traffic from the application is redirected to port 15001 (Envoy outbound listener)
- All inbound TCP traffic to the pod is redirected to port 15006 (Envoy inbound listener)
- Traffic from the Envoy process itself is excluded (to prevent loops)

### Step 3: Outbound Processing

The Envoy sidecar on service A's pod receives the request on its outbound listener. It then:

1. Resolves the destination (service-b) using the service registry information from istiod
2. Applies any VirtualService routing rules (traffic splitting, header-based routing, etc.)
3. Applies DestinationRule policies (load balancing, connection pool settings)
4. Initiates mTLS with the destination sidecar
5. Adds telemetry headers for distributed tracing
6. Forwards the request to the destination pod

### Step 4: Inbound Processing

The Envoy sidecar on service B's pod receives the incoming request on its inbound listener. It:

1. Terminates the mTLS connection and verifies the client certificate
2. Checks authorization policies (is service A allowed to call this endpoint?)
3. Applies any rate limiting or fault injection configured
4. Forwards the request to the application on localhost

### Step 5: Response

The response follows the same path in reverse. Service B's application responds, the response goes through service B's sidecar, travels over the network, arrives at service A's sidecar, and finally reaches service A's application.

## Envoy Listeners and Clusters

Envoy organizes its configuration around two main concepts: listeners and clusters.

**Listeners** define where Envoy accepts connections:

```bash
# View all listeners on a sidecar
istioctl proxy-config listeners deploy/my-app -n default
```

Output looks something like:

```
ADDRESS       PORT  MATCH   DESTINATION
0.0.0.0       15001 ALL     PassthroughCluster
0.0.0.0       15006 ALL     Inline Route
10.96.0.1     443   ALL     Cluster: outbound|443||kubernetes.default.svc.cluster.local
10.96.10.20   8080  ALL     Cluster: outbound|8080||service-b.default.svc.cluster.local
```

**Clusters** define the upstream endpoints Envoy can send traffic to:

```bash
# View all clusters (upstream services)
istioctl proxy-config clusters deploy/my-app -n default
```

**Endpoints** are the actual pod IP addresses behind each cluster:

```bash
# View endpoints for a specific service
istioctl proxy-config endpoints deploy/my-app --cluster "outbound|8080||service-b.default.svc.cluster.local"
```

## Load Balancing

The data plane handles load balancing across service instances. By default, Envoy uses round-robin, but you can configure other algorithms through DestinationRules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b
spec:
  host: service-b
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

Available load balancing algorithms:
- `ROUND_ROBIN` - Default, distributes requests evenly
- `LEAST_REQUEST` - Sends to the instance with fewest active requests
- `RANDOM` - Random selection
- `PASSTHROUGH` - No load balancing, use the original destination

You can also use consistent hashing for session affinity:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b
spec:
  host: service-b
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

## Connection Pools

Each sidecar maintains connection pools to upstream services. These are configurable:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b
spec:
  host: service-b
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 30ms
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
```

## Health Checking

Envoy performs passive health checking through outlier detection. If a backend starts failing, it gets temporarily removed:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: service-b
spec:
  host: service-b
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

This removes an endpoint from the pool after 5 consecutive 5xx errors, checked every 10 seconds. The endpoint is ejected for at least 30 seconds, and at most 50% of endpoints can be ejected at the same time.

## Telemetry Collection

Every request through the data plane generates telemetry:

- **Metrics** - Request count, latency histograms, request/response sizes. These are exposed as Prometheus metrics on port 15020 of each sidecar.
- **Tracing** - Each sidecar adds tracing headers (b3 or w3c trace context) and reports spans to the configured tracing backend.
- **Access logs** - Envoy can log every request with details like source, destination, response code, and latency.

Enable access logging in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
```

Then check the logs:

```bash
kubectl logs my-app-xyz -c istio-proxy | head -5
```

## Performance Impact

The data plane does add some overhead. Each request goes through two extra network hops (source sidecar and destination sidecar). Typical numbers:

- Latency overhead: 1-3ms per hop (so 2-6ms total)
- Memory per sidecar: 40-60 MB baseline
- CPU per sidecar: varies with traffic, typically 10-50m for moderate traffic

You can tune sidecar resource limits:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      concurrency: 2
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
```

## Reducing Sidecar Scope

By default, each sidecar is configured with information about every service in the mesh. For large meshes, this can use a lot of memory. Use the Sidecar resource to limit the scope:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: my-app-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  egress:
  - hosts:
    - "./service-b.default.svc.cluster.local"
    - "istio-system/*"
```

This tells the sidecar for my-app to only know about service-b and services in istio-system. It will not receive configuration for any other service, saving memory and reducing xDS push times.

The data plane is the workhorse of Istio. Every feature you use - traffic management, security, observability - is implemented by the Envoy sidecars in the data plane. Understanding how requests flow through the sidecars, how load balancing works, and how to tune performance gives you the knowledge to run Istio effectively in production.
