# How to Set Proxy Memory Limits in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Proxy Memory, Resource Limits, Kubernetes, Performance

Description: Learn how to properly set memory requests and limits for Istio sidecar proxies to prevent OOMKills and optimize cluster resource usage.

---

One of the more common issues people run into with Istio is the sidecar proxy consuming more memory than expected. Each pod in the mesh gets an Envoy proxy sidecar, and if you are running hundreds or thousands of pods, the memory adds up fast. Setting appropriate memory limits keeps your cluster healthy and prevents surprise OOMKill events that take down workloads during traffic spikes.

## How Much Memory Does the Istio Proxy Need?

The baseline memory consumption of an Envoy sidecar depends on several factors:

- **Number of services in the mesh** - Envoy maintains a configuration for every service it might need to route to. More services means more memory for configuration data.
- **Number of endpoints** - Each service endpoint (pod IP) consumes memory in Envoy's cluster configuration.
- **Rate of traffic** - Active connections and request buffering use memory.
- **Access logging** - If access logs are buffered in memory before flushing, they contribute to usage.
- **Number of listeners** - Each port the proxy listens on creates a listener with associated filter chains.

For a small mesh (under 50 services), 128Mi is usually enough. For medium meshes (50-500 services), plan for 256Mi to 512Mi. Large meshes with thousands of services might need 1Gi or more per sidecar.

## Setting Memory at the Pod Level

The most direct way to set memory limits is through pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        sidecar.istio.io/proxyMemory: "256Mi"
        sidecar.istio.io/proxyMemoryLimit: "512Mi"
    spec:
      containers:
      - name: my-service
        image: my-service:1.0
        ports:
        - containerPort: 8080
```

The `proxyMemory` annotation sets the memory request (what Kubernetes guarantees), and `proxyMemoryLimit` sets the hard limit (where Kubernetes kills the container if exceeded).

## Setting Mesh-Wide Memory Defaults

For mesh-wide defaults, configure the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        resources:
          requests:
            memory: "128Mi"
          limits:
            memory: "512Mi"
```

Apply with:

```bash
istioctl install -f istio-config.yaml
```

This sets the default for all sidecars that don't have pod-level overrides.

## Understanding Request vs Limit

Getting the request and limit values right is important:

- **Memory request** - This is what Kubernetes uses for scheduling. The scheduler places your pod on a node that has at least this much memory available. Setting this too high wastes schedulable capacity. Setting it too low means pods might get scheduled on nodes that are already tight on memory.

- **Memory limit** - This is the hard ceiling. If the proxy exceeds this, it gets OOMKilled. Setting this too low causes random proxy crashes under load. Setting it too high reduces the protection against runaway memory usage.

A good starting point is to set the request to what the proxy uses under normal conditions and the limit to 2-3x that amount to handle spikes:

```yaml
annotations:
  sidecar.istio.io/proxyMemory: "128Mi"
  sidecar.istio.io/proxyMemoryLimit: "384Mi"
```

## Monitoring Proxy Memory Usage

Before setting limits, measure actual usage. Use Prometheus queries to understand your sidecar memory patterns:

```promql
# Current memory usage per proxy
container_memory_working_set_bytes{container="istio-proxy"}

# Average memory by deployment
avg by (pod) (container_memory_working_set_bytes{container="istio-proxy", namespace="default"})

# P99 memory usage across all proxies
quantile(0.99, container_memory_working_set_bytes{container="istio-proxy"})

# Memory usage relative to limits
container_memory_working_set_bytes{container="istio-proxy"} / container_spec_memory_limit_bytes{container="istio-proxy"}
```

You can run these in Grafana or the Prometheus UI:

```bash
kubectl port-forward -n istio-system svc/prometheus 9090:9090
```

## Detecting OOMKill Events

If proxies are getting killed, check for OOMKill events:

```bash
# Check pod events
kubectl describe pod <pod-name> | grep -A 5 OOMKilled

# Check for restarts
kubectl get pods -o custom-columns='NAME:.metadata.name,RESTARTS:.status.containerStatuses[?(@.name=="istio-proxy")].restartCount'

# Look at the last terminated state
kubectl get pod <pod-name> -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].lastState}'
```

If you see `OOMKilled` as the reason for termination, the memory limit is too low.

## Reducing Proxy Memory Usage

Before just increasing limits, consider ways to reduce memory consumption:

**Limit the Sidecar scope with Sidecar resources:**

By default, every sidecar gets configuration for every service in the mesh. If a service only talks to a few other services, you can limit its view:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-service-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-service
  egress:
  - hosts:
    - "default/api-gateway.default.svc.cluster.local"
    - "default/database.default.svc.cluster.local"
    - "istio-system/*"
```

This dramatically reduces memory because the proxy only maintains configuration for the listed services instead of everything in the mesh.

**Reduce access log buffering:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: ""
```

Disabling or reducing access logs lowers memory usage. If you need access logs, consider sending them to a file instead of stdout to reduce buffer pressure.

## Per-Workload Sizing Strategy

Different workloads have different proxy memory needs. Here is a tiered approach:

**Low-traffic internal services:**

```yaml
annotations:
  sidecar.istio.io/proxyMemory: "64Mi"
  sidecar.istio.io/proxyMemoryLimit: "256Mi"
```

**Standard API services:**

```yaml
annotations:
  sidecar.istio.io/proxyMemory: "128Mi"
  sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

**High-traffic gateway services:**

```yaml
annotations:
  sidecar.istio.io/proxyMemory: "256Mi"
  sidecar.istio.io/proxyMemoryLimit: "1Gi"
```

**Edge proxies handling many connections:**

```yaml
annotations:
  sidecar.istio.io/proxyMemory: "512Mi"
  sidecar.istio.io/proxyMemoryLimit: "2Gi"
```

## Testing Memory Under Load

Use a load testing tool to understand memory behavior under stress:

```bash
# Install a load generator
kubectl run fortio --image=fortio/fortio -- load -qps 1000 -t 60s http://my-service/api

# Watch memory usage during the test
kubectl top pod -l app=my-service --containers
```

The `--containers` flag shows resource usage per container, so you can see the `istio-proxy` memory separately from your application.

## Setting Limits in Helm Values

If you install Istio using Helm, set defaults in your values file:

```yaml
# values.yaml for istio/istiod chart
global:
  proxy:
    resources:
      requests:
        memory: "128Mi"
      limits:
        memory: "512Mi"
```

```bash
helm upgrade istio-base istio/base -n istio-system
helm upgrade istiod istio/istiod -n istio-system -f values.yaml
```

## Using VPA for Automatic Sizing

If you run the Vertical Pod Autoscaler (VPA), it can help right-size proxy memory:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-service-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: istio-proxy
      minAllowed:
        memory: "64Mi"
      maxAllowed:
        memory: "1Gi"
```

Start with `updateMode: "Off"` to just get recommendations without automatic updates. Check recommendations with:

```bash
kubectl get vpa my-service-vpa -o yaml
```

Once you trust the recommendations, switch to `updateMode: "Auto"` for automatic adjustments.

Proxy memory management is one of those things that seems minor until you are running hundreds of pods. Taking the time to measure, set appropriate limits, and scope your sidecars properly saves real money on cluster costs and prevents production incidents from OOMKills.
