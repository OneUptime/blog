# How to Exclude Ports from Istio Traffic Interception

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traffic Management, Kubernetes, Envoy, Networking

Description: Learn how to exclude specific inbound and outbound ports from Istio sidecar traffic interception using annotations and mesh configuration.

---

Not all traffic in your pods should go through the Istio sidecar. Some protocols don't work well with Envoy's Layer 7 processing, some services handle their own TLS, and some legacy systems just break when a proxy sits in the middle. Excluding specific ports from Istio's traffic interception is a common requirement, and there are several ways to do it depending on your needs.

## When to Exclude Ports

There are a few common scenarios where port exclusion makes sense:

- Database connections that use their own TLS and authentication (MySQL on 3306, PostgreSQL on 5432)
- Services running protocols that Envoy doesn't understand well
- Health check endpoints that need direct access
- High-throughput connections where proxy overhead matters
- External service connections that shouldn't be metered or retried by Envoy

## Excluding Inbound Ports

To exclude specific inbound ports from interception, add the `traffic.sidecar.istio.io/excludeInboundPorts` annotation to your pod template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-database-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-database-app
  template:
    metadata:
      labels:
        app: my-database-app
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "3306,5432"
    spec:
      containers:
      - name: my-database-app
        image: my-database-app:latest
        ports:
        - containerPort: 8080
        - containerPort: 3306
        - containerPort: 5432
```

In this example, traffic to ports 3306 and 5432 goes directly to the application without passing through Envoy, while port 8080 traffic still gets intercepted.

After applying, you can verify by checking the iptables rules:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L ISTIO_INBOUND -v -n
```

You should see RETURN rules for ports 3306 and 5432, meaning traffic to those ports skips the redirect chain.

## Excluding Outbound Ports

For outbound traffic, use the `traffic.sidecar.istio.io/excludeOutboundPorts` annotation:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379,9042"
```

This is useful when your pod connects to external databases or caches and you don't want Envoy to handle those connections. A full deployment example:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379"
    spec:
      containers:
      - name: api-server
        image: api-server:latest
        ports:
        - containerPort: 8080
        env:
        - name: DATABASE_URL
          value: "postgresql://db.example.com:5432/mydb"
        - name: REDIS_URL
          value: "redis://redis.example.com:6379"
```

## Using Include Instead of Exclude

Sometimes it's easier to specify which ports should be intercepted rather than which ones should be excluded. The `traffic.sidecar.istio.io/includeInboundPorts` annotation lets you do exactly that:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeInboundPorts: "8080,8443"
```

With this annotation, only ports 8080 and 8443 will be intercepted. All other ports get direct traffic. This is the cleaner approach when your pod exposes many ports but only a couple should go through Envoy.

The equivalent for outbound:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeOutboundPorts: "80,443"
```

## Setting Defaults at the Mesh Level

If you want to exclude certain ports across the entire mesh, configure it in the IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
    global:
      proxy:
        excludeInboundPorts: "22"
        excludeOutboundPorts: "5432,6379"
```

These defaults apply to all pods unless overridden by pod-level annotations. This is handy for cluster-wide exclusions like SSH (port 22) or common database ports.

With Helm, the equivalent configuration is:

```bash
helm install istiod istio/istiod -n istio-system \
  --set global.proxy.excludeInboundPorts="22" \
  --set global.proxy.excludeOutboundPorts="5432\,6379"
```

Note the escaped comma in the Helm command.

## Namespace-Level Configuration

You can also set port exclusions at the namespace level using the `istio.io/rev` and annotation-based configuration. While there's no direct namespace annotation for port exclusion, you can achieve this through the Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
  ingress:
  - port:
      number: 8080
      protocol: HTTP
      name: http
    defaultEndpoint: 127.0.0.1:8080
```

The Sidecar resource's `ingress` field controls which ports the proxy listens on for inbound traffic. Only ports listed here will have listeners created in Envoy.

## Verifying Port Exclusions

After deploying, verify that port exclusions are working. First, check the iptables rules:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -S ISTIO_INBOUND
```

For excluded inbound ports, you'll see rules like:

```text
-A ISTIO_INBOUND -p tcp --dport 3306 -j RETURN
-A ISTIO_INBOUND -p tcp --dport 5432 -j RETURN
```

For outbound exclusions:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -S ISTIO_OUTPUT
```

You should see RETURN rules for the excluded ports.

You can also verify using `istioctl`:

```bash
istioctl proxy-config listener <pod-name>
```

Excluded ports won't have corresponding Envoy listeners.

## Combining Annotations

You can use multiple annotations together:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeInboundPorts: "3306"
    traffic.sidecar.istio.io/excludeOutboundPorts: "5432,6379"
    traffic.sidecar.istio.io/includeInboundPorts: ""
```

Be careful with combinations, though. If you set `includeInboundPorts` to an empty string, it means "include all ports" (which is the default behavior). If you set it to `""` AND also set `excludeInboundPorts`, the exclude takes precedence on those specific ports.

## Gotchas and Tips

One thing to watch out for: when you exclude an outbound port, traffic on that port won't get mutual TLS, retries, circuit breaking, or any other Istio features. It goes straight from your app to the destination. Make sure that's actually what you want.

Another common mistake is excluding ports for services within the mesh. If service A excludes outbound port 8080 and service B runs on port 8080 within the mesh, the connection from A to B won't use mTLS. Service B's sidecar will still expect mTLS on the inbound side (unless B also has a permissive mode PeerAuthentication), so the connection will fail.

Port exclusions are a simple but powerful tool for fine-tuning how Istio handles your traffic. Use them when the proxy gets in the way, but be thoughtful about what you're giving up in terms of observability and security.
