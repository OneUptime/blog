# How to Create Your First Istio DestinationRule

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DestinationRule, Service Mesh, Kubernetes, Traffic Management

Description: A step-by-step guide to creating your first Istio DestinationRule resource for controlling traffic policies to your services.

---

If you have been working with Istio for a bit, you probably know about VirtualService for routing. But the other half of Istio's traffic management story is the DestinationRule. This is the resource that tells Envoy proxies how to talk to your upstream services - things like load balancing algorithms, connection pool sizes, TLS settings, and more.

Think of it this way: VirtualService controls where traffic goes, and DestinationRule controls how it gets there.

## What Exactly Is a DestinationRule?

A DestinationRule is an Istio custom resource that applies after routing has happened. Once Envoy decides which service a request should go to (based on VirtualService rules), the DestinationRule kicks in to define the traffic policy for reaching that service.

Here is what a DestinationRule can configure:

- Load balancing algorithm (round robin, random, least connections, etc.)
- Connection pool settings (max connections, max requests per connection)
- Outlier detection (ejecting unhealthy hosts)
- TLS settings for upstream connections
- Service subsets (grouping pods by labels for canary deployments, etc.)

## Prerequisites

Before you start, make sure you have:

- A Kubernetes cluster running (minikube, kind, or a cloud provider)
- Istio installed with the default profile or higher
- At least one service deployed with an Envoy sidecar injected
- `kubectl` and `istioctl` available on your machine

You can verify Istio is running:

```bash
kubectl get pods -n istio-system
```

And confirm sidecar injection is enabled for your namespace:

```bash
kubectl label namespace default istio-injection=enabled
```

## Deploying a Sample Application

To have something to work with, deploy a simple httpbin service:

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  labels:
    app: httpbin
spec:
  ports:
  - name: http
    port: 8000
    targetPort: 80
  selector:
    app: httpbin
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
spec:
  replicas: 3
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
      - name: httpbin
        image: docker.io/kennethreitz/httpbin
        ports:
        - containerPort: 80
EOF
```

Give it a minute and verify the pods are up:

```bash
kubectl get pods -l app=httpbin
```

## Creating Your First DestinationRule

Here is the simplest possible DestinationRule. It just sets the load balancing policy to RANDOM for the httpbin service:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-destination
spec:
  host: httpbin
  trafficPolicy:
    loadBalancer:
      simple: RANDOM
```

Apply it:

```bash
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-destination
spec:
  host: httpbin
  trafficPolicy:
    loadBalancer:
      simple: RANDOM
EOF
```

That is it. You just created a DestinationRule. Every request routed to the httpbin service will now use random load balancing instead of the default round robin.

## Understanding the Key Fields

The `host` field is the most important part. It specifies which service this rule applies to. The value should match the Kubernetes service name. You can use short names like `httpbin` (same namespace), or fully qualified names like `httpbin.default.svc.cluster.local`.

The `trafficPolicy` section is where all the good stuff lives. It can contain:

```yaml
trafficPolicy:
  loadBalancer: {}      # Load balancing algorithm
  connectionPool: {}    # Connection pool limits
  outlierDetection: {}  # Health checking / ejection
  tls: {}               # TLS settings
```

## Verifying Your DestinationRule

Check that it was created successfully:

```bash
kubectl get destinationrule httpbin-destination -o yaml
```

You can also use istioctl to analyze your configuration for problems:

```bash
istioctl analyze
```

If there is a mismatch between your DestinationRule host and an actual service, istioctl will warn you.

To see the actual Envoy configuration that your DestinationRule generates, use:

```bash
istioctl proxy-config cluster <pod-name> --fqdn httpbin.default.svc.cluster.local -o json
```

Replace `<pod-name>` with any pod that has a sidecar. This shows you the raw cluster configuration in Envoy, including the load balancing policy.

## A More Complete Example

Here is a DestinationRule that uses several features at once:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: httpbin-full
spec:
  host: httpbin
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

This DestinationRule does four things:

1. Uses least-request load balancing (sends traffic to the pod with fewest active requests)
2. Limits TCP connections to 100
3. Sets HTTP connection pool limits
4. Enables outlier detection - if a pod returns 5 consecutive 5xx errors, it gets ejected from the pool for 30 seconds

## Common Mistakes to Avoid

**Wrong host name**: The host in a DestinationRule must match the Kubernetes service name exactly. If your service is called `my-svc` but you write `mysvc`, the rule will be silently ignored.

**Namespace mismatch**: If your DestinationRule is in namespace A but the service is in namespace B, use the FQDN: `httpbin.namespace-b.svc.cluster.local`.

**Conflicting DestinationRules**: Having two DestinationRules for the same host in the same namespace leads to undefined behavior. Stick to one DestinationRule per host per namespace.

**Forgetting the sidecar**: DestinationRules only work when the Envoy sidecar is injected. If your pod does not have a sidecar, the rule does nothing.

## Cleaning Up

To remove the DestinationRule:

```bash
kubectl delete destinationrule httpbin-destination
```

And if you want to clean up the sample app too:

```bash
kubectl delete service httpbin
kubectl delete deployment httpbin
```

## What to Explore Next

Now that you have your first DestinationRule working, there is a lot more you can do with it. You can define subsets to split traffic between different versions of a service. You can configure mTLS for service-to-service encryption. You can set up circuit breaking to protect your services from cascading failures.

The DestinationRule is one of the most powerful resources in Istio, and getting comfortable with it will give you fine-grained control over how your services communicate within the mesh.
