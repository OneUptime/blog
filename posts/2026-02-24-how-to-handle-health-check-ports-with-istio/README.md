# How to Handle Health Check Ports with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Health Checks, Ports, Kubernetes, Networking

Description: Manage health check port configurations in Istio, including dedicated health ports, port exclusions, and handling port conflicts with the sidecar proxy.

---

Many applications expose health check endpoints on a different port than their main service port. This is a common pattern, especially when you want the health endpoint to be lightweight and not affected by the main application's load. With Istio, using separate health check ports requires some attention to how the sidecar proxy handles port interception.

## The Dedicated Health Port Pattern

Instead of exposing `/healthz` on the same port as your API (say 8080), your application listens for health checks on a separate port (say 8081):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: default
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
        - name: my-service
          image: myregistry/my-service:latest
          ports:
            - name: http
              containerPort: 8080
            - name: health
              containerPort: 8081
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8081
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8081
            periodSeconds: 5
```

With Istio's probe rewriting enabled, this works without any extra configuration. The sidecar injector sees the probe targets port 8081 and rewrites it to go through the agent on port 15021. The agent forwards to port 8081.

## Excluding Health Ports from Istio

Sometimes you want the health check port to bypass the Istio proxy entirely. This is useful when:

- You want health checks to work even if the sidecar is not ready
- You need to avoid any overhead from the proxy on health traffic
- You are troubleshooting and want to eliminate Istio as a variable

Exclude the health port from Istio interception:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: default
spec:
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "8081"
    spec:
      containers:
        - name: my-service
          image: myregistry/my-service:latest
          ports:
            - name: http
              containerPort: 8080
            - name: health
              containerPort: 8081
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8081
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8081
            periodSeconds: 5
```

The `excludeInboundPorts` annotation tells the init container not to add iptables rules for port 8081. Traffic to this port goes directly to your container, bypassing Envoy completely.

When you exclude a port, probe rewriting is not needed for probes targeting that port. The kubelet can reach the container directly. However, Istio still rewrites the probe unless you explicitly disable rewriting.

## Kubernetes Service Port vs Container Port

Be clear about the difference between Service ports and container ports in the context of health checks:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: my-service
  ports:
    - name: http
      port: 80          # Service port (external)
      targetPort: 8080  # Container port
    - name: health
      port: 8081        # Service port
      targetPort: 8081  # Container port
```

Kubernetes probes target **container ports**, not Service ports. The kubelet sends probes directly to the pod IP on the container port. So in your probe definition, always use the container port:

```yaml
# Correct - uses container port
livenessProbe:
  httpGet:
    port: 8081

# Wrong - this would target the Service port
# (but probes don't go through the Service)
```

## Istio Reserved Ports

Istio uses several ports that you must not use for your application:

| Port | Purpose |
|------|---------|
| 15000 | Envoy admin |
| 15001 | Envoy outbound |
| 15004 | Debug |
| 15006 | Envoy inbound |
| 15020 | Merged Prometheus |
| 15021 | Health check agent |
| 15053 | DNS proxy |
| 15090 | Envoy Prometheus |

If your health check port conflicts with any of these, change it. Using port 15021 for your own health endpoint will definitely cause problems since that is the probe rewriting agent port.

Check for conflicts:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- ss -tlnp
kubectl exec -it <pod-name> -c my-service -- ss -tlnp
```

## Named Ports for Protocol Detection

Istio uses port names to detect protocols. For your health check port, name it appropriately:

```yaml
ports:
  - name: http-health
    containerPort: 8081
```

Names starting with `http` tell Istio this is HTTP traffic. Other recognized prefixes:

- `http` / `http2` - HTTP traffic
- `grpc` - gRPC traffic
- `tcp` - plain TCP
- `tls` - TLS-encrypted traffic
- `mongo` / `mysql` / `redis` - database protocols

For a health check port, `http-health` or `http-admin` are good names.

## Multiple Health Ports

Some applications expose different health endpoints on different ports:

```yaml
containers:
  - name: my-service
    ports:
      - name: http
        containerPort: 8080
      - name: http-health
        containerPort: 8081
      - name: http-metrics
        containerPort: 9090
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8081
    readinessProbe:
      httpGet:
        path: /readyz
        port: 8081
    startupProbe:
      httpGet:
        path: /started
        port: 8081
```

All probes can use the same health port, even if the endpoints are different. Istio rewrites all of them.

If you want the metrics port also excluded from Istio:

```yaml
annotations:
  traffic.sidecar.istio.io/excludeInboundPorts: "8081,9090"
```

## Health Port with NetworkPolicy

If you use Kubernetes NetworkPolicies, make sure the kubelet can reach your health check port:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-health-checks
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: my-service
  ingress:
    - ports:
        - port: 8081
          protocol: TCP
      from: []  # Allow from anywhere (kubelet IPs vary)
    - ports:
        - port: 8080
          protocol: TCP
      from:
        - podSelector: {}  # Only from pods in the namespace
```

Note that `from: []` allows all sources. The kubelet sends probes from the node IP, which is outside the pod network. If you restrict sources, the kubelet might be blocked.

## Dynamic Health Port Configuration

Some applications pick their health port dynamically or through environment variables. You can use variable substitution in your deployment:

```yaml
containers:
  - name: my-service
    env:
      - name: HEALTH_PORT
        value: "8081"
    ports:
      - name: http-health
        containerPort: 8081
    livenessProbe:
      httpGet:
        path: /healthz
        port: 8081
```

Keep the port in the probe definition and the container port list in sync with your environment variable. Kubernetes does not support variable substitution in probe definitions, so you have to hardcode it.

## Debugging Port Issues

If health checks are failing and you suspect a port problem:

```bash
# Check what ports are actually listening inside the container
kubectl exec -it <pod-name> -c my-service -- ss -tlnp

# Check what ports Envoy is intercepting
kubectl exec -it <pod-name> -c istio-proxy -- \
  pilot-agent request GET listeners | grep -E "address|port"

# Check what ports are excluded from interception
kubectl get pod <pod-name> -o jsonpath='{.metadata.annotations.traffic\.sidecar\.istio\.io/excludeInboundPorts}'

# Verify the probe configuration
kubectl get pod <pod-name> -o yaml | grep -A10 "livenessProbe"
```

If your application says it is listening on port 8081 but the probe fails, check if iptables is redirecting traffic:

```bash
kubectl exec -it <pod-name> -c istio-proxy -- iptables -t nat -L ISTIO_INBOUND -n
```

This shows which ports are being redirected to Envoy. If your health port appears in this list and should not, add the `excludeInboundPorts` annotation.

Health check ports in Istio are straightforward once you understand the interaction between probe rewriting, port exclusion, and protocol detection. Use a dedicated health port if your application supports it, name the port with an `http-` prefix, and exclude it from Istio interception if you want probes to bypass the proxy. Keep the port numbers away from Istio's reserved range and you will avoid most issues.
