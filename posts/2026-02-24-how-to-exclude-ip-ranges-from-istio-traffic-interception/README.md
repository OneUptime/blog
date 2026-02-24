# How to Exclude IP Ranges from Istio Traffic Interception

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Networking, Traffic Management, Kubernetes, IP Ranges

Description: A practical guide to excluding specific IP address ranges from Istio sidecar proxy traffic interception for external services and special endpoints.

---

Sometimes you need traffic from your pods to bypass the Istio sidecar entirely. External databases, cloud provider metadata endpoints, third-party APIs with their own mTLS, or on-premises services that sit outside the mesh are all common examples. Istio lets you exclude specific IP ranges from traffic interception so those connections go directly from your application to the destination.

## The Cloud Metadata Endpoint

The most common IP exclusion is the cloud provider metadata endpoint at 169.254.169.254. Almost every cloud provider uses this address to serve instance metadata, and it should never go through Envoy. On AWS, GCP, and Azure, pods that need to access instance metadata or assume IAM roles need direct access to this IP.

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "169.254.169.254/32"
```

Without this exclusion, requests to the metadata endpoint get intercepted by Envoy, which doesn't know how to route them, and the requests fail or time out.

## Pod-Level IP Range Exclusion

To exclude IP ranges for a specific pod, use the `traffic.sidecar.istio.io/excludeOutboundIPRanges` annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.200.0.0/16,192.168.50.0/24,169.254.169.254/32"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

Multiple CIDR ranges are comma-separated. In this example, any outbound traffic to 10.200.0.0/16, 192.168.50.0/24, or the metadata endpoint bypasses Envoy entirely.

## Including Only Specific IP Ranges

The inverse approach is to specify which IP ranges should be intercepted and let everything else pass through directly. Use `traffic.sidecar.istio.io/includeOutboundIPRanges` for this:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeOutboundIPRanges: "10.96.0.0/12"
```

This is particularly useful when your Kubernetes service CIDR is well-defined. You can tell Istio to only intercept traffic destined for the service network, and everything else goes directly to the network stack. In many clusters, the service CIDR is something like 10.96.0.0/12, so you'd only intercept in-cluster service traffic.

A wildcard value of `*` means "intercept everything" (which is the default):

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeOutboundIPRanges: "*"
```

## Mesh-Wide Configuration

To set IP range exclusions for the entire mesh, configure them during installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    global:
      proxy:
        excludeIPRanges: "169.254.169.254/32,10.200.0.0/16"
        includeIPRanges: "*"
```

Or with Helm:

```bash
helm install istiod istio/istiod -n istio-system \
  --set global.proxy.excludeIPRanges="169.254.169.254/32" \
  --set global.proxy.includeIPRanges="*"
```

Pod-level annotations always override the mesh-wide configuration. This lets you set sensible defaults globally and fine-tune per workload.

## How It Works Under the Hood

When you exclude an IP range, the `istio-init` container (or CNI plugin) adds a RETURN rule to the ISTIO_OUTPUT chain in the pod's iptables. This rule matches packets destined for the excluded IP range and sends them back to the normal routing path, skipping the redirect to Envoy.

You can verify this by inspecting the iptables rules:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -S ISTIO_OUTPUT
```

With the metadata endpoint excluded, you'll see something like:

```
-A ISTIO_OUTPUT -d 169.254.169.254/32 -j RETURN
```

For the include approach, you'll see the redirect only matches the included CIDR:

```
-A ISTIO_OUTPUT -d 10.96.0.0/12 -j ISTIO_REDIRECT
-A ISTIO_OUTPUT -j RETURN
```

## Practical Example: External Database

Say your application connects to an external PostgreSQL database hosted at 10.200.5.10 and a Redis cache at 10.200.5.20. These services are outside the mesh and don't expect mTLS connections.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.200.5.0/24,169.254.169.254/32"
    spec:
      containers:
      - name: order-service
        image: order-service:latest
        env:
        - name: DB_HOST
          value: "10.200.5.10"
        - name: REDIS_HOST
          value: "10.200.5.20"
```

By excluding the entire 10.200.5.0/24 subnet, both the database and cache connections bypass Envoy. The application connects directly, using whatever authentication and encryption the external services require.

## Practical Example: On-Premises Services via VPN

If your Kubernetes cluster connects to on-premises networks through a VPN, you might have an entire CIDR block that should bypass Istio:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "172.31.0.0/16,169.254.169.254/32"
```

The 172.31.0.0/16 range represents the on-premises network. Traffic to those IPs goes through the VPN tunnel directly without Envoy trying to handle it.

## Combining with ServiceEntry

An alternative to IP exclusion is creating a ServiceEntry for external services. This tells Istio about the external service so Envoy can route to it properly:

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-database
  namespace: my-namespace
spec:
  hosts:
  - external-db.example.com
  location: MESH_EXTERNAL
  ports:
  - number: 5432
    name: tcp-postgres
    protocol: TCP
  resolution: DNS
```

The difference is that with a ServiceEntry, traffic still goes through Envoy, which means you get metrics and logging. With IP exclusion, traffic completely bypasses Envoy. Choose based on whether you need observability for that traffic.

## Excluding Inbound IP Ranges

While less common, you can also exclude inbound traffic from specific IP ranges:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundIPRanges: "10.0.0.0/8"
```

This means inbound connections from IPs in the 10.0.0.0/8 range won't go through the Envoy inbound listener. This might be useful for load balancer health checks that come from known IP ranges.

## Debugging IP Range Issues

If connections to excluded IPs aren't working as expected, check the iptables rules first:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L ISTIO_OUTPUT -v -n
```

Look at the packet counters. If the RETURN rule for your excluded CIDR shows zero packets, the traffic might not be matching the rule. Double-check the CIDR notation and make sure the destination IP falls within the range.

You can also test connectivity directly:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- curl -v http://169.254.169.254/latest/meta-data/
```

If this works but the same request from the application container times out, the iptables rules might not be configured correctly. Compare the rules you see with what you expect.

IP range exclusion is one of the most straightforward ways to carve out exceptions in Istio's traffic management. Use it for external services that don't belong in the mesh, and combine it with ServiceEntries when you still want observability without full mesh features.
