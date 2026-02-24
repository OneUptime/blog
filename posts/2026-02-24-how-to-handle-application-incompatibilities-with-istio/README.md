# How to Handle Application Incompatibilities with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Service Mesh, Troubleshooting, Compatibility

Description: Practical solutions for dealing with applications that do not work correctly with Istio sidecar proxies and the service mesh.

---

Not every application works seamlessly with Istio. Some applications have specific networking requirements, protocol quirks, or startup behaviors that conflict with the Envoy sidecar proxy. Knowing the common incompatibilities and how to handle them saves hours of debugging.

## Applications That Need Direct Network Access

Some applications require direct access to the network without traffic being intercepted by the sidecar. This includes things like CNI plugins, monitoring agents that scrape node metrics, and applications that use raw sockets.

You can exclude specific pods from sidecar injection entirely:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: network-monitor
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: network-monitor
        image: network-monitor:latest
```

Or you can exclude specific IP ranges or ports from being captured by the sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.1/32,10.0.0.2/32"
        traffic.sidecar.istio.io/excludeOutboundPorts: "3306,6379"
        traffic.sidecar.istio.io/excludeInboundPorts: "9090"
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

## Applications with Init Containers That Need Network

Init containers run before the sidecar starts. If your init containers need to make network calls (like downloading configuration or running database migrations), they will fail because the Envoy proxy is not ready yet.

The fix depends on your Istio version. With newer Istio versions, you can use the `holdApplicationUntilProxyStarts` setting, but this only affects regular containers, not init containers.

For init containers that need network access, you have two options.

Option 1: Move the initialization logic to a regular container with a startup probe:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
    spec:
      containers:
      - name: initializer
        image: my-init-image:latest
        command: ["/bin/sh", "-c", "run-migrations.sh && sleep infinity"]
        startupProbe:
          exec:
            command: ["cat", "/tmp/init-complete"]
          periodSeconds: 5
          failureThreshold: 30
      - name: my-app
        image: my-app:latest
```

Option 2: Exclude the init container traffic from sidecar capture:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      initContainers:
      - name: db-migration
        image: migration-tool:latest
        command: ["/bin/sh", "-c"]
        args:
        - |
          # Wait for DNS to be available
          until nslookup database-host; do sleep 1; done
          run-migration
      containers:
      - name: my-app
        image: my-app:latest
```

## Applications Using Server-First Protocols

Protocols where the server sends data first (like MySQL, MongoDB, and some SMTP servers) can be problematic with Istio. Envoy expects the client to send data first in most configurations.

For MySQL connections:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql
spec:
  ports:
  - name: tcp-mysql    # Must use tcp- prefix
    port: 3306
    targetPort: 3306
```

You might also need a DestinationRule to disable mTLS for the database connection if the database is not in the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: mysql-no-mtls
spec:
  host: mysql.database.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
```

## Applications That Bind to Specific Ports

If your application binds to port 15000, 15001, 15006, 15020, 15021, or 15090, it will conflict with the Envoy sidecar. These ports are reserved by Istio.

```bash
# Check which ports Istio uses
# 15000 - Envoy admin interface
# 15001 - Envoy outbound
# 15006 - Envoy inbound
# 15020 - Istio agent health check
# 15021 - Health check
# 15090 - Envoy Prometheus telemetry
```

The fix is to change your application's port bindings to avoid these reserved ports. If you absolutely cannot change the application port, you can adjust the sidecar's ports, but this is not recommended.

## Applications Using HostNetwork

Pods with `hostNetwork: true` bypass the pod network namespace entirely. The sidecar injection does not work correctly with host networking because iptables rules cannot be applied.

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-agent
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"  # Must disable for hostNetwork pods
    spec:
      hostNetwork: true
      containers:
      - name: node-agent
        image: node-agent:latest
```

There is no workaround for this. Applications using host networking must be excluded from the mesh.

## Applications with Custom iptables Rules

Some applications or sidecars modify iptables rules themselves. This conflicts with the iptables rules that Istio's init container (istio-init) creates.

Check for conflicts:

```bash
# View Istio's iptables rules inside a pod
kubectl exec my-pod -c istio-proxy -- iptables -t nat -L -n -v
```

If your application needs custom iptables rules, you need to coordinate them with Istio's rules or use the `traffic.sidecar.istio.io/excludeOutboundPorts` annotation to prevent conflicts.

## gRPC Applications with Custom Load Balancing

gRPC applications that implement their own client-side load balancing (like using the `grpclb` or `pick_first` policies) can conflict with Istio's load balancing. The sidecar proxy already handles load balancing, so having two layers can cause uneven distribution.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-service
spec:
  host: grpc-service
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
```

The recommended approach is to let Istio handle load balancing and configure your gRPC client to use a single connection per call. Alternatively, you can use gRPC proxyless mode to let the application handle it directly with xDS.

## WebSocket Applications

WebSocket connections generally work with Istio, but long-lived WebSocket connections can hit timeout issues. The default idle timeout for HTTP connections in Envoy is 1 hour.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: websocket-service
spec:
  hosts:
  - websocket-service
  http:
  - match:
    - headers:
        upgrade:
          exact: websocket
    route:
    - destination:
        host: websocket-service
    timeout: 0s  # Disable timeout for websocket connections
```

## Creating a Compatibility Matrix

Before migration, audit your applications and create a compatibility matrix:

```bash
# List all deployments and their potential issues
for deploy in $(kubectl get deploy -n production -o name); do
  echo "=== $deploy ==="
  kubectl get $deploy -n production -o json | jq '{
    hostNetwork: .spec.template.spec.hostNetwork,
    initContainers: [.spec.template.spec.initContainers[]?.name],
    ports: [.spec.template.spec.containers[].ports[]?.containerPort],
    annotations: .spec.template.metadata.annotations
  }'
done
```

For each application, categorize it as:
- **Compatible**: Works with sidecar injection, no changes needed
- **Needs configuration**: Works with annotations or traffic exclusions
- **Incompatible**: Must be excluded from the mesh

Most applications fall into the first two categories. Truly incompatible applications are rare, but they exist. The key is identifying them before migration so you have a plan for each one.
