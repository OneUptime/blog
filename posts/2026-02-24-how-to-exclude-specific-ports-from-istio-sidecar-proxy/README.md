# How to Exclude Specific Ports from Istio Sidecar Proxy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Kubernetes, Envoy, Traffic Management

Description: Learn how to exclude specific ports from Istio sidecar proxy interception using annotations and mesh-wide configuration options.

---

Not every port in your application should go through the Istio sidecar proxy. Health check ports, database connections that use client-side TLS, or monitoring endpoints that need direct access - there are legitimate reasons to bypass the proxy for certain ports. Istio provides several mechanisms to do this, from pod-level annotations to mesh-wide settings.

This post covers the different ways to exclude ports from sidecar interception, when to use each approach, and what to watch out for.

## Understanding How Port Interception Works

When Istio injects a sidecar into your pod, it also adds an init container called `istio-init`. This init container sets up iptables rules that redirect all inbound and outbound traffic through the Envoy proxy. Every TCP connection going in or out of your pod passes through these rules.

The redirect happens at the kernel level before your application sees the traffic. This means your application doesn't need to know about the proxy - it just sends and receives traffic as normal. But it also means that if there's a port you don't want proxied, you need to explicitly tell Istio to skip it.

## Excluding Inbound Ports

To exclude specific ports from inbound traffic interception, use the `traffic.sidecar.istio.io/excludeInboundPorts` annotation on your pod:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "8081,8082"
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          ports:
            - containerPort: 8080  # This goes through the proxy
            - containerPort: 8081  # This bypasses the proxy
            - containerPort: 8082  # This bypasses the proxy
```

With this annotation, traffic arriving on ports 8081 and 8082 goes directly to your application container without passing through Envoy. Port 8080 still gets proxied normally.

A common use case is health check endpoints. If your kubelet health checks are hitting the sidecar and causing issues, you can exclude the health check port:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "15021"
```

Though for health checks specifically, Istio already handles this with its health check rewriting feature, so you usually don't need to exclude health check ports manually.

## Excluding Outbound Ports

For outbound traffic, use the `traffic.sidecar.istio.io/excludeOutboundPorts` annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379"
    spec:
      containers:
        - name: my-app
          image: my-app:latest
```

This tells Istio to not intercept outbound connections to ports 5432 (PostgreSQL) and 6379 (Redis). Traffic to these ports goes directly from your application to the destination, bypassing the sidecar entirely.

Why would you do this? A few common reasons:

- **Client-side TLS**: If your application already handles TLS for database connections, having the proxy in the middle can cause double encryption or certificate issues
- **Performance-sensitive connections**: Skipping the proxy removes a hop and reduces latency for database queries
- **Protocol compatibility**: Some protocols don't work well with Envoy's TCP proxying, especially those that embed IP addresses in the protocol data

## Including Only Specific Inbound Ports

The flip side of excluding ports is including only specific ports. Use `traffic.sidecar.istio.io/includeInboundPorts` to specify which ports should be intercepted, and everything else gets excluded:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeInboundPorts: "8080,8443"
```

This approach is useful when your container exposes many ports but you only want a few going through the proxy. It's cleaner than listing a long exclusion list.

Similarly, for outbound traffic:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeOutboundPorts: "80,443,8080"
```

**Note**: Using `includeOutboundPorts` means only those ports get intercepted for outbound traffic. Everything else bypasses the proxy. Be careful with this - it's easy to accidentally exclude traffic that should be managed by the mesh.

## Mesh-Wide Port Exclusion

If you want to exclude certain ports across your entire mesh, you can configure it at the mesh level using the MeshConfig:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_INTERCEPTION_MODE: REDIRECT
  values:
    global:
      proxy:
        excludeInboundPorts: "8081,8082"
        excludeOutboundPorts: "5432,6379"
```

You can also use the `ProxyConfig` resource for namespace-scoped defaults:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ProxyConfig
metadata:
  name: default-proxy-config
  namespace: production
spec:
  environmentVariables:
    ISTIO_META_INTERCEPTION_MODE: REDIRECT
```

## Verifying Port Exclusions

After applying port exclusions, verify that the iptables rules are correct inside the pod:

```bash
# Get a shell in the istio-proxy container
kubectl exec -it deploy/my-app -c istio-proxy -n default -- bash

# Check iptables rules (needs NET_ADMIN capability or nsenter)
iptables -t nat -L -n -v
```

Alternatively, you can check the init container logs to see what iptables rules were applied:

```bash
kubectl logs deploy/my-app -c istio-init -n default
```

The output will show lines like:

```
Environment:
  ISTIO_INBOUND_PORTS=8080
  ISTIO_LOCAL_EXCLUDE_PORTS=
  ISTIO_OUTBOUND_PORTS=
```

You can also use istioctl to check the proxy configuration:

```bash
istioctl proxy-config listeners deploy/my-app -n default
```

Excluded ports won't show up as listeners in the proxy configuration.

## Port Exclusion vs Sidecar Resource

The Sidecar resource and port exclusion annotations serve different purposes:

- **Port exclusion annotations**: Control iptables rules - traffic on excluded ports completely bypasses Envoy at the network level
- **Sidecar resource**: Controls Envoy's configuration - which clusters and routes the proxy knows about

Port exclusion is more aggressive. When you exclude a port, the traffic never touches Envoy at all. With the Sidecar resource, traffic still goes through Envoy but the proxy might not have routing rules for certain destinations.

Use port exclusion when you need traffic to completely bypass the proxy. Use the Sidecar resource when you want to reduce the proxy's configuration scope while still having traffic flow through it.

## Common Pitfalls

**Losing mTLS**: When you exclude a port from the sidecar, traffic on that port won't get mTLS encryption from Istio. If you need encrypted communication, your application must handle TLS itself.

**Losing observability**: Excluded port traffic won't show up in Istio telemetry, Kiali graphs, or distributed traces. You lose visibility into those connections.

**Losing traffic management**: No retries, no circuit breaking, no timeout management for excluded ports. Your application is on its own for those connections.

**Pod restart required**: Changing port exclusion annotations requires a pod restart because the iptables rules are set up by the init container at pod startup. Updating the annotation on a running pod has no effect until the pod restarts.

```bash
# Restart the deployment to pick up annotation changes
kubectl rollout restart deployment/my-app -n default
```

Port exclusion is a useful tool, but it's a trade-off. You're giving up the benefits of the service mesh for those specific connections. Make sure that trade-off makes sense for your use case before applying it broadly.
