# How to Handle Port Conflicts with Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Port, Troubleshooting, Networking

Description: Diagnose and resolve port conflicts between application containers and the Istio sidecar proxy, including reserved ports and iptables redirect issues.

---

Port conflicts between your application and the Istio sidecar proxy are one of the more frustrating issues to debug. Your application works fine without Istio, but the moment sidecar injection is enabled, things break. Connections time out, ports are already in use, or traffic goes to the wrong place. Understanding how the sidecar uses ports and how iptables redirection works is the key to fixing these problems.

## How the Istio Sidecar Uses Ports

The Envoy sidecar proxy in Istio uses several ports by default:

- **15000** - Envoy admin interface
- **15001** - Envoy outbound listener (all outbound traffic gets redirected here)
- **15006** - Envoy inbound listener (all inbound traffic gets redirected here)
- **15020** - Merged Prometheus telemetry and health checks
- **15021** - Health check endpoint
- **15053** - DNS proxy (if enabled)
- **15090** - Envoy Prometheus stats

If your application uses any of these ports, you have a conflict. The sidecar will fail to start, or traffic will get misrouted.

Check if your application uses any conflicting ports:

```bash
kubectl get pods -n my-namespace -o jsonpath='{range .items[*].spec.containers[*]}{.name}{"\t"}{range .ports[*]}{.containerPort}{","}{end}{"\n"}{end}'
```

## Diagnosing Port Conflicts

The symptoms of a port conflict vary. Sometimes the sidecar container crashes:

```bash
kubectl logs my-pod -n my-namespace -c istio-proxy | grep "bind"
```

You might see errors like:

```
[critical] error: binding to address 0.0.0.0:15001: Address already in use
```

Other times, both the sidecar and the application start fine, but traffic gets misdirected because iptables rules redirect traffic to the wrong listener.

Check the iptables rules in a pod to see how traffic is being redirected:

```bash
kubectl exec my-pod -n my-namespace -c istio-proxy -- iptables -t nat -L -n -v
```

The output shows the ISTIO_REDIRECT and ISTIO_IN_REDIRECT chains that capture traffic and send it to the sidecar.

## Fixing Application Port Conflicts

If your application uses a port that conflicts with Istio, you have a few options.

**Option 1: Change the application port.** This is the simplest fix. If your application listens on port 15000, change it to something else. The Istio reserved ports are documented and unlikely to change between versions.

**Option 2: Exclude the port from sidecar interception.** If you cannot change the application port, tell Istio to skip intercepting traffic on that port:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "15090"
        traffic.sidecar.istio.io/excludeOutboundPorts: "15090"
    spec:
      containers:
      - name: my-app
        ports:
        - containerPort: 15090
```

With these annotations, iptables rules will not redirect traffic on port 15090 to the sidecar. Traffic on that port goes directly to the application container.

## Handling Multiple Application Ports

Many applications expose multiple ports (HTTP, HTTPS, gRPC, metrics, health checks). When Istio intercepts traffic, it needs to know the protocol for each port to handle it correctly.

Declare ports explicitly in your Service definition with protocol-aware naming:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: my-namespace
spec:
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
    protocol: TCP
  - name: grpc-internal
    port: 9090
    targetPort: 9090
    protocol: TCP
  - name: tcp-metrics
    port: 9100
    targetPort: 9100
    protocol: TCP
  selector:
    app: my-service
```

The port names are important. Istio uses the prefix to determine the protocol:
- `http-*` or `http2-*` for HTTP
- `grpc-*` for gRPC
- `tcp-*` for raw TCP
- `tls-*` for TLS
- `mongo-*` for MongoDB
- `mysql-*` for MySQL
- `redis-*` for Redis

If you name a port `metrics` without a protocol prefix, Istio defaults to treating it as TCP in auto-detection mode, which might not be what you want for an HTTP metrics endpoint.

## Excluding Ports from Sidecar Redirection

Sometimes you need certain ports to bypass the sidecar entirely. Common reasons include:

- Database ports where the sidecar adds unwanted latency
- Ports used by init containers or sidecar containers other than Envoy
- Ports that use protocols Istio does not understand

Use annotations to exclude ports:

```yaml
metadata:
  annotations:
    # Skip these ports for inbound traffic
    traffic.sidecar.istio.io/excludeInboundPorts: "3306,5432,6379"
    # Skip these ports for outbound traffic
    traffic.sidecar.istio.io/excludeOutboundPorts: "3306,5432,6379"
```

Or include only specific ports, which is the inverse approach:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/includeInboundPorts: "8080,9090"
```

When you use `includeInboundPorts`, only those ports get redirected to the sidecar. All other inbound ports go directly to the application.

## Handling Port 443 Conflicts

Port 443 is a special case. Many applications want to serve HTTPS on port 443, but Istio's mTLS also operates on the same port conceptually. When an application terminates TLS itself and the sidecar also tries to handle TLS, you get conflicts.

The fix depends on your TLS strategy:

**Let Istio handle TLS (recommended):**

Configure your application to listen on plain HTTP, and let the sidecar handle mTLS:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        ports:
        - containerPort: 8080  # Plain HTTP
```

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  ports:
  - name: https
    port: 443
    targetPort: 8080  # Maps external 443 to internal 8080
```

**Let the application handle TLS:**

If the application must terminate TLS itself, disable Istio's protocol detection for that port:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-app-tls
  namespace: my-namespace
spec:
  host: my-app
  trafficPolicy:
    tls:
      mode: DISABLE
    portLevelSettings:
    - port:
        number: 443
      tls:
        mode: DISABLE
```

## The init Container Port Problem

The Istio init container (`istio-init`) runs before your application and sets up iptables rules. If your application has its own init containers that need network access, they will be affected by the iptables rules set up by `istio-init`.

The order of init containers matters. By default, `istio-init` runs first. If your init container needs to make outbound calls before the sidecar proxy is ready, those calls will fail because traffic is redirected to a proxy that is not running yet.

Solutions:

**Use the `holdApplicationUntilProxyStarts` option:**

```yaml
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

This makes the application container wait until the sidecar proxy is ready.

**Exclude your init container's traffic:**

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.0/8"
```

This excludes traffic to the specified IP ranges from sidecar interception, allowing init containers to reach services directly.

## Checking the Effective Port Configuration

After making changes, verify the actual iptables rules and proxy configuration:

```bash
# Check iptables rules
kubectl exec my-pod -c istio-proxy -- iptables -t nat -S

# Check proxy listeners
istioctl proxy-config listener my-pod -n my-namespace

# Check proxy clusters
istioctl proxy-config cluster my-pod -n my-namespace

# Check proxy routes
istioctl proxy-config route my-pod -n my-namespace
```

The listener output is particularly useful. It shows you which ports the proxy is listening on and how traffic is being handled:

```bash
istioctl proxy-config listener my-pod -n my-namespace -o json | jq '.[].address.socketAddress.portValue'
```

## Summary

Port conflicts with the Istio sidecar come down to understanding which ports are reserved by the proxy, how iptables redirection works, and which ports your application needs. Use explicit port naming with protocol prefixes in Service definitions, exclude ports that should bypass the sidecar, and verify the configuration with istioctl proxy-config. Most conflicts are straightforward once you know the mechanics, but they can be confusing if you are debugging them for the first time.
